CREATE OR REPLACE FUNCTION public.review_content(
  p_content_id uuid,
  p_action public.approval_action_type,
  p_reason text DEFAULT NULL
) RETURNS public.content
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.content;
  v_perm public.permission_status;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_action = 'rejected' AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'a rejection reason is required';
  END IF;

  SELECT c.* INTO v_row
  FROM public.content c
  WHERE c.id = p_content_id AND c.user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'content not found';
  END IF;
  IF v_row.status <> 'ready_for_review' THEN
    RAISE EXCEPTION 'content is not ready for review';
  END IF;

  IF p_action = 'approved' THEN
    IF v_row.source_id IS NOT NULL THEN
      SELECT s.permission_status INTO v_perm
      FROM public.sources s
      WHERE s.id = v_row.source_id;
      IF v_perm = 'not_allowed' THEN
        RAISE EXCEPTION 'cannot approve content from a not-allowed source';
      END IF;
    END IF;
    UPDATE public.content
    SET
      status = 'approved',
      approved_by = v_user,
      approved_at = now(),
      rejection_reason = NULL
    WHERE id = p_content_id
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.content
    SET
      status = 'rejected',
      approved_by = NULL,
      approved_at = NULL,
      rejection_reason = btrim(p_reason)
    WHERE id = p_content_id
    RETURNING * INTO v_row;
  END IF;

  INSERT INTO public.approval_actions (user_id, content_id, action, reason)
  VALUES (
    v_user,
    p_content_id,
    p_action,
    CASE WHEN p_action = 'rejected' THEN btrim(p_reason) ELSE NULL END
  );

  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.review_content(uuid, public.approval_action_type, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_content(uuid, public.approval_action_type, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.schedule_content(
  p_content_id uuid,
  p_platform public.platform,
  p_scheduled_at timestamptz
) RETURNS public.publishing_jobs
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.content;
  v_perm public.permission_status;
  v_job public.publishing_jobs;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'scheduled_at is required';
  END IF;

  SELECT c.* INTO v_row
  FROM public.content c
  WHERE c.id = p_content_id AND c.user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'content not found';
  END IF;
  IF v_row.status NOT IN ('approved', 'scheduled') THEN
    RAISE EXCEPTION 'only approved content can be scheduled';
  END IF;

  IF v_row.source_id IS NOT NULL THEN
    SELECT s.permission_status INTO v_perm
    FROM public.sources s
    WHERE s.id = v_row.source_id;
    IF v_perm = 'not_allowed' THEN
      RAISE EXCEPTION 'cannot schedule content from a not-allowed source';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.publishing_jobs j
    WHERE j.content_id = p_content_id
      AND j.platform = p_platform
      AND j.status IN ('waiting', 'scheduled', 'publishing')
  ) THEN
    RAISE EXCEPTION 'an active job already exists for this platform';
  END IF;

  INSERT INTO public.publishing_jobs (
    user_id, content_id, platform, scheduled_at, status, result, error_message
  ) VALUES (
    v_user,
    p_content_id,
    p_platform,
    p_scheduled_at,
    'scheduled',
    'Locally scheduled. Platform not connected — nothing was published.',
    NULL
  ) RETURNING * INTO v_job;

  UPDATE public.content
  SET status = 'scheduled', scheduled_at = p_scheduled_at
  WHERE id = p_content_id;

  RETURN v_job;
END; $$;
REVOKE ALL ON FUNCTION public.schedule_content(uuid, public.platform, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_content(uuid, public.platform, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_publishing_job(p_job_id uuid)
RETURNS public.publishing_jobs
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_job public.publishing_jobs;
  v_remaining integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT j.* INTO v_job
  FROM public.publishing_jobs j
  WHERE j.id = p_job_id AND j.user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'job not found';
  END IF;
  IF v_job.status NOT IN ('scheduled', 'waiting') THEN
    RAISE EXCEPTION 'only scheduled or waiting jobs can be cancelled';
  END IF;

  UPDATE public.publishing_jobs
  SET status = 'cancelled', result = 'Cancelled locally. Platform not connected.'
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  SELECT count(*) INTO v_remaining
  FROM public.publishing_jobs
  WHERE content_id = v_job.content_id AND status = 'scheduled';

  IF v_remaining = 0 THEN
    UPDATE public.content
    SET status = 'approved'
    WHERE id = v_job.content_id AND user_id = v_user AND status = 'scheduled';
  END IF;

  RETURN v_job;
END; $$;
REVOKE ALL ON FUNCTION public.cancel_publishing_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_publishing_job(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.retry_publishing_job(p_job_id uuid)
RETURNS public.publishing_jobs
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_job public.publishing_jobs;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT j.* INTO v_job
  FROM public.publishing_jobs j
  WHERE j.id = p_job_id AND j.user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'job not found';
  END IF;
  IF v_job.status <> 'failed' THEN
    RAISE EXCEPTION 'retry only applies to failed jobs';
  END IF;

  UPDATE public.publishing_jobs
  SET
    status = CASE WHEN v_job.scheduled_at IS NOT NULL THEN 'scheduled' ELSE 'waiting' END,
    error_message = NULL,
    result = 'Retried locally. Platform not connected — nothing was published.'
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  IF v_job.status = 'scheduled' THEN
    UPDATE public.content
    SET status = 'scheduled', scheduled_at = COALESCE(v_job.scheduled_at, scheduled_at)
    WHERE id = v_job.content_id AND user_id = v_user;
  END IF;

  RETURN v_job;
END; $$;
REVOKE ALL ON FUNCTION public.retry_publishing_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_publishing_job(uuid) TO authenticated;