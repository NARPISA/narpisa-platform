-- Show the license region field as plural in the database UI because a license
-- can span multiple comma-separated regions.

update public.license_data_fields
set
  label = 'Regions',
  sort_order = 30
where field_key = 'region';
