/*
  # Remove payslip validation logic
  
  1. Changes
    - Remove payslip sequence validation
    - Remove payslip validation functions
    - Simplify document validation
*/

-- Remove payslip validation functions
DROP FUNCTION IF EXISTS validate_payslip_sequence CASCADE;
DROP FUNCTION IF EXISTS get_payslip_data CASCADE;

-- Simplify document validation in applications table
ALTER TABLE applications 
DROP COLUMN IF EXISTS payslip_validation,
DROP COLUMN IF EXISTS payslip_sequence;