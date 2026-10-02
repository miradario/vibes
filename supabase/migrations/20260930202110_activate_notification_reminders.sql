-- Deploy the compatible send-push function before applying this migration.
select cron.alter_job((select jobid from cron.job where jobname = 'vibes-notification-reminders'), active := true);
