-- Migration to add Password column to USER table
-- Run this in your Supabase SQL Editor

ALTER TABLE "USER" ADD COLUMN "Password" VARCHAR(255);
