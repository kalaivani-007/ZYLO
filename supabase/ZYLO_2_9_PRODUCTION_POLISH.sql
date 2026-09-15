-- ZYLO 2.9 — atomic credits + idempotent payment finalization
-- Run once in Supabase SQL Editor before testing the 2.9 backend.

create or replace function public.zylo_consume_generation_credit(p_user_id uuid)
returns table(success boolean, balance integer, lifetime_used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_used integer;
begin
  select uc.balance, uc.lifetime_used
    into v_balance, v_used
  from public.user_credits uc
  where uc.user_id = p_user_id
  for update;

  if not found or v_balance < 1 then
    return query select false, coalesce(v_balance,0), coalesce(v_used,0);
    return;
  end if;

  update public.user_credits
  set balance = balance - 1,
      lifetime_used = lifetime_used + 1,
      updated_at = now()
  where user_id = p_user_id
  returning user_credits.balance, user_credits.lifetime_used
  into v_balance, v_used;

  insert into public.usage_events(user_id,event_type,units,metadata)
  values (p_user_id,'ai_generation',-1,jsonb_build_object('source','visual_ai'));

  return query select true, v_balance, v_used;
end;
$$;

create or replace function public.zylo_finalize_payment(
  p_user_id uuid,
  p_order_id text,
  p_payment_id text
)
returns table(success boolean, already_verified boolean, credits_added integer, balance integer, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_balance integer;
begin
  select * into v_order
  from public.payment_orders
  where user_id = p_user_id and razorpay_order_id = p_order_id
  for update;

  if not found then
    return query select false,false,0,0,'Payment order not found'::text;
    return;
  end if;

  if v_order.status = 'paid' then
    select uc.balance into v_balance from public.user_credits uc where uc.user_id=p_user_id;
    return query select true,true,0,coalesce(v_balance,0),'Payment already verified'::text;
    return;
  end if;

  if exists(select 1 from public.payment_orders where razorpay_payment_id=p_payment_id and razorpay_order_id<>p_order_id) then
    return query select false,false,0,0,'Payment ID is already linked to another order'::text;
    return;
  end if;

  insert into public.user_credits(user_id,balance,lifetime_purchased,lifetime_used)
  values(p_user_id,3,0,0)
  on conflict(user_id) do nothing;

  update public.user_credits
  set balance=balance+v_order.credits,
      lifetime_purchased=lifetime_purchased+v_order.credits,
      updated_at=now()
  where user_id=p_user_id
  returning user_credits.balance into v_balance;

  update public.payment_orders
  set status='paid', razorpay_payment_id=p_payment_id, updated_at=now()
  where id=v_order.id;

  insert into public.usage_events(user_id,event_type,units,metadata)
  values(p_user_id,'credit_purchase',v_order.credits,
    jsonb_build_object('order_id',p_order_id,'payment_id',p_payment_id,'pack_id',v_order.pack_id));

  return query select true,false,v_order.credits,v_balance,'Payment finalized'::text;
end;
$$;

revoke all on function public.zylo_consume_generation_credit(uuid) from public, anon, authenticated;
revoke all on function public.zylo_finalize_payment(uuid,text,text) from public, anon, authenticated;
grant execute on function public.zylo_consume_generation_credit(uuid) to service_role;
grant execute on function public.zylo_finalize_payment(uuid,text,text) to service_role;
