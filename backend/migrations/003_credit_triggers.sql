-- 积分记录触发器，保证余额更新与记录写入保持一致。
CREATE OR REPLACE FUNCTION public.apply_credit_record()
RETURNS TRIGGER AS $$
DECLARE
  next_balance integer;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 服务层已经完成原子扣减并写入 balance_after 时，触发器不再二次更新余额。
  IF NEW.balance_after IS NOT NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.users
  SET credit_balance = credit_balance + NEW.amount
  WHERE id = NEW.user_id
    AND credit_balance + NEW.amount >= 0
  RETURNING credit_balance INTO next_balance;

  IF next_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient credits';
  END IF;

  NEW.balance_after = next_balance;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_credit_record ON public.credit_records;
CREATE TRIGGER trg_apply_credit_record
BEFORE INSERT ON public.credit_records
FOR EACH ROW EXECUTE FUNCTION public.apply_credit_record();
