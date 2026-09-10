ALTER TYPE public.publishing_status ADD VALUE IF NOT EXISTS 'cancelled';

CREATE OR REPLACE FUNCTION public.cancel_publishing_job(p_job_id uuid)
RETURNS public.publishing_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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