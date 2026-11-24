-- Uses the send_back kind added by 20261120120000 (#286): a send-back is a decline of an
-- approved idea, so its decision is always declined, as for a take-down.

ALTER TABLE reviews ADD CONSTRAINT reviews_send_back_is_decline
  CHECK (kind <> 'send_back' OR decision = 'declined');
