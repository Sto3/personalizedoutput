-- Fix the profile creation trigger function to handle errors gracefully
-- This prevents user creation from failing when profile insert has issues

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_attempts INTEGER := 0;
BEGIN
  -- Generate a unique referral code with retry logic
  LOOP
    v_referral_code := generate_referral_code();
    v_attempts := v_attempts + 1;
    
    -- Check if this code already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code) THEN
      EXIT;
    END IF;
    
    -- Safety limit - use part of user ID if too many attempts
    IF v_attempts > 10 THEN
      v_referral_code := 'REF' || UPPER(SUBSTR(REPLACE(NEW.id::text, '-', ''), 1, 6));
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert the profile with ON CONFLICT to handle race conditions
  INSERT INTO public.profiles (id, email, referral_code, subscription_tier, subscription_status, monthly_outputs_limit)
  VALUES (
    NEW.id,
    NEW.email,
    v_referral_code,
    'free',
    'inactive',
    0
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Referral code collision - retry with ID-based code
    BEGIN
      INSERT INTO public.profiles (id, email, referral_code, subscription_tier, subscription_status, monthly_outputs_limit)
      VALUES (
        NEW.id,
        NEW.email,
        'REF' || UPPER(SUBSTR(REPLACE(NEW.id::text, '-', ''), 1, 6)),
        'free',
        'inactive',
        0
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log but don't fail user creation
    RAISE WARNING 'Profile creation warning for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
