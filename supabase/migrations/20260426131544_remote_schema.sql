drop extension if exists "pg_net";

drop trigger if exists "documents_set_updated_at" on "public"."documents";

drop trigger if exists "extracted_records_set_updated_at" on "public"."extracted_records";

drop trigger if exists "open_air_sites_set_updated_at" on "public"."open_air_sites";

drop trigger if exists "processing_jobs_set_updated_at" on "public"."processing_jobs";

drop trigger if exists "profiles_set_updated_at" on "public"."profiles";

drop trigger if exists "site_commodity_metrics_set_updated_at" on "public"."site_commodity_metrics";

drop trigger if exists "site_data_set_updated_at" on "public"."site_data";

drop trigger if exists "site_facts_set_updated_at" on "public"."site_facts";

drop trigger if exists "site_water_metrics_set_updated_at" on "public"."site_water_metrics";

drop trigger if exists "sites_set_updated_at" on "public"."sites";

drop trigger if exists "underground_sites_set_updated_at" on "public"."underground_sites";

drop policy "admins can delete citations" on "public"."citations";

drop policy "admins can manage citations" on "public"."citations";

drop policy "admins can update citations" on "public"."citations";

drop policy "admins can delete commodities" on "public"."commodities";

drop policy "admins can manage commodities" on "public"."commodities";

drop policy "admins can update commodities" on "public"."commodities";

drop policy "admins can delete countries" on "public"."countries";

drop policy "admins can manage countries" on "public"."countries";

drop policy "admins can update countries" on "public"."countries";

drop policy "admins can create documents" on "public"."documents";

drop policy "admins can delete documents" on "public"."documents";

drop policy "admins can update documents" on "public"."documents";

drop policy "admins can delete licenses" on "public"."licenses";

drop policy "admins can manage licenses" on "public"."licenses";

drop policy "admins can update licenses" on "public"."licenses";

drop policy "admins can delete open air sites" on "public"."open_air_sites";

drop policy "admins can manage open air sites" on "public"."open_air_sites";

drop policy "admins can update open air sites" on "public"."open_air_sites";

drop policy "admins can read processing jobs" on "public"."processing_jobs";

drop policy "admins can delete site commodities" on "public"."site_commodities";

drop policy "admins can manage site commodities" on "public"."site_commodities";

drop policy "admins can update site commodities" on "public"."site_commodities";

drop policy "admins can delete commodity metric definitions" on "public"."site_commodity_metric_definitions";

drop policy "admins can manage commodity metric definitions" on "public"."site_commodity_metric_definitions";

drop policy "admins can update commodity metric definitions" on "public"."site_commodity_metric_definitions";

drop policy "admins can delete site commodity metrics" on "public"."site_commodity_metrics";

drop policy "admins can manage site commodity metrics" on "public"."site_commodity_metrics";

drop policy "admins can update site commodity metrics" on "public"."site_commodity_metrics";

drop policy "admins can delete site data" on "public"."site_data";

drop policy "admins can manage site data" on "public"."site_data";

drop policy "admins can update site data" on "public"."site_data";

drop policy "admins can delete site data fields" on "public"."site_data_fields";

drop policy "admins can manage site data fields" on "public"."site_data_fields";

drop policy "admins can update site data fields" on "public"."site_data_fields";

drop policy "admins can delete site facts" on "public"."site_facts";

drop policy "admins can manage site facts" on "public"."site_facts";

drop policy "admins can update site facts" on "public"."site_facts";

drop policy "admins can delete water metric definitions" on "public"."site_water_metric_definitions";

drop policy "admins can manage water metric definitions" on "public"."site_water_metric_definitions";

drop policy "admins can update water metric definitions" on "public"."site_water_metric_definitions";

drop policy "admins can delete site water metrics" on "public"."site_water_metrics";

drop policy "admins can manage site water metrics" on "public"."site_water_metrics";

drop policy "admins can update site water metrics" on "public"."site_water_metrics";

drop policy "admins can delete sites" on "public"."sites";

drop policy "admins can manage sites" on "public"."sites";

drop policy "admins can update sites" on "public"."sites";

drop policy "admins can create subscriptions" on "public"."subscriptions";

drop policy "admins can delete subscriptions" on "public"."subscriptions";

drop policy "admins can update subscriptions" on "public"."subscriptions";

drop policy "users can read their own subscriptions" on "public"."subscriptions";

drop policy "admins can create tiers" on "public"."tiers";

drop policy "admins can delete tiers" on "public"."tiers";

drop policy "admins can update tiers" on "public"."tiers";

drop policy "admins can delete underground sites" on "public"."underground_sites";

drop policy "admins can manage underground sites" on "public"."underground_sites";

drop policy "admins can update underground sites" on "public"."underground_sites";

alter table "public"."citations" drop constraint "citations_document_id_fkey";

alter table "public"."documents" drop constraint "documents_created_by_fkey";

alter table "public"."extracted_records" drop constraint "extracted_records_document_id_fkey";

alter table "public"."extracted_records" drop constraint "extracted_records_job_id_fkey";

alter table "public"."licenses" drop constraint "licenses_country_id_fkey";

alter table "public"."open_air_sites" drop constraint "open_air_sites_site_id_fkey";

alter table "public"."processing_jobs" drop constraint "processing_jobs_document_id_fkey";

alter table "public"."site_commodities" drop constraint "site_commodities_commodity_id_fkey";

alter table "public"."site_commodities" drop constraint "site_commodities_site_id_fkey";

alter table "public"."site_commodity_metrics" drop constraint "site_commodity_metrics_commodity_id_fkey";

alter table "public"."site_commodity_metrics" drop constraint "site_commodity_metrics_definition_id_fkey";

alter table "public"."site_commodity_metrics" drop constraint "site_commodity_metrics_fact_id_fkey";

alter table "public"."site_commodity_metrics" drop constraint "site_commodity_metrics_site_id_fkey";

alter table "public"."site_data" drop constraint "site_data_site_id_fkey";

alter table "public"."site_facts" drop constraint "site_facts_citation_id_fkey";

alter table "public"."site_facts" drop constraint "site_facts_commodity_id_fkey";

alter table "public"."site_facts" drop constraint "site_facts_document_id_fkey";

alter table "public"."site_facts" drop constraint "site_facts_extracted_record_id_fkey";

alter table "public"."site_facts" drop constraint "site_facts_site_id_fkey";

alter table "public"."site_water_metrics" drop constraint "site_water_metrics_definition_id_fkey";

alter table "public"."site_water_metrics" drop constraint "site_water_metrics_fact_id_fkey";

alter table "public"."site_water_metrics" drop constraint "site_water_metrics_site_id_fkey";

alter table "public"."sites" drop constraint "sites_country_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_profile_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_tier_id_fkey";

alter table "public"."underground_sites" drop constraint "underground_sites_site_id_fkey";

alter table "public"."citations" alter column "id" set default nextval('public.citations_id_seq'::regclass);

alter table "public"."commodities" alter column "id" set default nextval('public.commodities_id_seq'::regclass);

alter table "public"."countries" alter column "id" set default nextval('public.countries_id_seq'::regclass);

alter table "public"."documents" alter column "id" set default nextval('public.documents_id_seq'::regclass);

alter table "public"."documents" alter column "latest_job_status" set default 'queued'::public.processing_job_status;

alter table "public"."documents" alter column "latest_job_status" set data type public.processing_job_status using "latest_job_status"::text::public.processing_job_status;

alter table "public"."licenses" alter column "id" set default nextval('public.licenses_id_seq'::regclass);

alter table "public"."processing_jobs" alter column "status" set default 'queued'::public.processing_job_status;

alter table "public"."processing_jobs" alter column "status" set data type public.processing_job_status using "status"::text::public.processing_job_status;

alter table "public"."profiles" alter column "role" set default 'researcher'::public.user_type;

alter table "public"."profiles" alter column "role" set data type public.user_type using "role"::text::public.user_type;

alter table "public"."site_commodity_metric_definitions" alter column "id" set default nextval('public.site_commodity_metric_definitions_id_seq'::regclass);

alter table "public"."site_commodity_metrics" alter column "id" set default nextval('public.site_commodity_metrics_id_seq'::regclass);

alter table "public"."site_data" alter column "stage" set data type public.site_stage using "stage"::text::public.site_stage;

alter table "public"."site_data_fields" alter column "data_type" set data type public.admin_field_data_type using "data_type"::text::public.admin_field_data_type;

alter table "public"."site_data_fields" alter column "id" set default nextval('public.site_data_fields_id_seq'::regclass);

alter table "public"."site_data_fields" alter column "subtype_scope" set data type public.mine_type using "subtype_scope"::text::public.mine_type;

alter table "public"."site_data_fields" alter column "table_target" set data type public.site_table_target using "table_target"::text::public.site_table_target;

alter table "public"."site_facts" alter column "status" set default 'candidate'::public.site_fact_status;

alter table "public"."site_facts" alter column "status" set data type public.site_fact_status using "status"::text::public.site_fact_status;

alter table "public"."site_facts" alter column "subtype_scope" set data type public.mine_type using "subtype_scope"::text::public.mine_type;

alter table "public"."site_facts" alter column "table_target" set data type public.site_table_target using "table_target"::text::public.site_table_target;

alter table "public"."site_facts" alter column "value_type" set data type public.site_fact_value_type using "value_type"::text::public.site_fact_value_type;

alter table "public"."site_water_metric_definitions" alter column "id" set default nextval('public.site_water_metric_definitions_id_seq'::regclass);

alter table "public"."site_water_metrics" alter column "id" set default nextval('public.site_water_metrics_id_seq'::regclass);

alter table "public"."sites" alter column "id" set default nextval('public.sites_id_seq'::regclass);

alter table "public"."sites" alter column "site_type" set data type public.mine_type using "site_type"::text::public.mine_type;

alter table "public"."sites" alter column "status" set default 'active'::public.site_status;

alter table "public"."sites" alter column "status" set data type public.site_status using "status"::text::public.site_status;

alter table "public"."citations" add constraint "citations_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."citations" validate constraint "citations_document_id_fkey";

alter table "public"."documents" add constraint "documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."documents" validate constraint "documents_created_by_fkey";

alter table "public"."extracted_records" add constraint "extracted_records_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."extracted_records" validate constraint "extracted_records_document_id_fkey";

alter table "public"."extracted_records" add constraint "extracted_records_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.processing_jobs(id) ON DELETE SET NULL not valid;

alter table "public"."extracted_records" validate constraint "extracted_records_job_id_fkey";

alter table "public"."licenses" add constraint "licenses_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE not valid;

alter table "public"."licenses" validate constraint "licenses_country_id_fkey";

alter table "public"."open_air_sites" add constraint "open_air_sites_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."open_air_sites" validate constraint "open_air_sites_site_id_fkey";

alter table "public"."processing_jobs" add constraint "processing_jobs_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."processing_jobs" validate constraint "processing_jobs_document_id_fkey";

alter table "public"."site_commodities" add constraint "site_commodities_commodity_id_fkey" FOREIGN KEY (commodity_id) REFERENCES public.commodities(id) ON DELETE CASCADE not valid;

alter table "public"."site_commodities" validate constraint "site_commodities_commodity_id_fkey";

alter table "public"."site_commodities" add constraint "site_commodities_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."site_commodities" validate constraint "site_commodities_site_id_fkey";

alter table "public"."site_commodity_metrics" add constraint "site_commodity_metrics_commodity_id_fkey" FOREIGN KEY (commodity_id) REFERENCES public.commodities(id) ON DELETE SET NULL not valid;

alter table "public"."site_commodity_metrics" validate constraint "site_commodity_metrics_commodity_id_fkey";

alter table "public"."site_commodity_metrics" add constraint "site_commodity_metrics_definition_id_fkey" FOREIGN KEY (definition_id) REFERENCES public.site_commodity_metric_definitions(id) ON DELETE RESTRICT not valid;

alter table "public"."site_commodity_metrics" validate constraint "site_commodity_metrics_definition_id_fkey";

alter table "public"."site_commodity_metrics" add constraint "site_commodity_metrics_fact_id_fkey" FOREIGN KEY (fact_id) REFERENCES public.site_facts(id) ON DELETE SET NULL not valid;

alter table "public"."site_commodity_metrics" validate constraint "site_commodity_metrics_fact_id_fkey";

alter table "public"."site_commodity_metrics" add constraint "site_commodity_metrics_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."site_commodity_metrics" validate constraint "site_commodity_metrics_site_id_fkey";

alter table "public"."site_data" add constraint "site_data_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."site_data" validate constraint "site_data_site_id_fkey";

alter table "public"."site_facts" add constraint "site_facts_citation_id_fkey" FOREIGN KEY (citation_id) REFERENCES public.citations(id) ON DELETE SET NULL not valid;

alter table "public"."site_facts" validate constraint "site_facts_citation_id_fkey";

alter table "public"."site_facts" add constraint "site_facts_commodity_id_fkey" FOREIGN KEY (commodity_id) REFERENCES public.commodities(id) ON DELETE SET NULL not valid;

alter table "public"."site_facts" validate constraint "site_facts_commodity_id_fkey";

alter table "public"."site_facts" add constraint "site_facts_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL not valid;

alter table "public"."site_facts" validate constraint "site_facts_document_id_fkey";

alter table "public"."site_facts" add constraint "site_facts_extracted_record_id_fkey" FOREIGN KEY (extracted_record_id) REFERENCES public.extracted_records(id) ON DELETE SET NULL not valid;

alter table "public"."site_facts" validate constraint "site_facts_extracted_record_id_fkey";

alter table "public"."site_facts" add constraint "site_facts_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."site_facts" validate constraint "site_facts_site_id_fkey";

alter table "public"."site_water_metrics" add constraint "site_water_metrics_definition_id_fkey" FOREIGN KEY (definition_id) REFERENCES public.site_water_metric_definitions(id) ON DELETE RESTRICT not valid;

alter table "public"."site_water_metrics" validate constraint "site_water_metrics_definition_id_fkey";

alter table "public"."site_water_metrics" add constraint "site_water_metrics_fact_id_fkey" FOREIGN KEY (fact_id) REFERENCES public.site_facts(id) ON DELETE SET NULL not valid;

alter table "public"."site_water_metrics" validate constraint "site_water_metrics_fact_id_fkey";

alter table "public"."site_water_metrics" add constraint "site_water_metrics_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."site_water_metrics" validate constraint "site_water_metrics_site_id_fkey";

alter table "public"."sites" add constraint "sites_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL not valid;

alter table "public"."sites" validate constraint "sites_country_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_profile_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_tier_id_fkey" FOREIGN KEY (tier_id) REFERENCES public.tiers(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_tier_id_fkey";

alter table "public"."underground_sites" add constraint "underground_sites_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."underground_sites" validate constraint "underground_sites_site_id_fkey";


  create policy "admins can delete citations"
  on "public"."citations"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage citations"
  on "public"."citations"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update citations"
  on "public"."citations"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete commodities"
  on "public"."commodities"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage commodities"
  on "public"."commodities"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update commodities"
  on "public"."commodities"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete countries"
  on "public"."countries"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage countries"
  on "public"."countries"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update countries"
  on "public"."countries"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can create documents"
  on "public"."documents"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can delete documents"
  on "public"."documents"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can update documents"
  on "public"."documents"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete licenses"
  on "public"."licenses"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage licenses"
  on "public"."licenses"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update licenses"
  on "public"."licenses"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete open air sites"
  on "public"."open_air_sites"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage open air sites"
  on "public"."open_air_sites"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update open air sites"
  on "public"."open_air_sites"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can read processing jobs"
  on "public"."processing_jobs"
  as permissive
  for select
  to authenticated
using (public.is_admin_user());



  create policy "admins can delete site commodities"
  on "public"."site_commodities"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage site commodities"
  on "public"."site_commodities"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update site commodities"
  on "public"."site_commodities"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete commodity metric definitions"
  on "public"."site_commodity_metric_definitions"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage commodity metric definitions"
  on "public"."site_commodity_metric_definitions"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update commodity metric definitions"
  on "public"."site_commodity_metric_definitions"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete site commodity metrics"
  on "public"."site_commodity_metrics"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage site commodity metrics"
  on "public"."site_commodity_metrics"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update site commodity metrics"
  on "public"."site_commodity_metrics"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete site data"
  on "public"."site_data"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage site data"
  on "public"."site_data"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update site data"
  on "public"."site_data"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete site data fields"
  on "public"."site_data_fields"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage site data fields"
  on "public"."site_data_fields"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update site data fields"
  on "public"."site_data_fields"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete site facts"
  on "public"."site_facts"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage site facts"
  on "public"."site_facts"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update site facts"
  on "public"."site_facts"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete water metric definitions"
  on "public"."site_water_metric_definitions"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage water metric definitions"
  on "public"."site_water_metric_definitions"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update water metric definitions"
  on "public"."site_water_metric_definitions"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete site water metrics"
  on "public"."site_water_metrics"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage site water metrics"
  on "public"."site_water_metrics"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update site water metrics"
  on "public"."site_water_metrics"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete sites"
  on "public"."sites"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage sites"
  on "public"."sites"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update sites"
  on "public"."sites"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can create subscriptions"
  on "public"."subscriptions"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can delete subscriptions"
  on "public"."subscriptions"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can update subscriptions"
  on "public"."subscriptions"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "users can read their own subscriptions"
  on "public"."subscriptions"
  as permissive
  for select
  to authenticated
using ((public.is_admin_user() OR (( SELECT auth.uid() AS uid) = profile_id)));



  create policy "admins can create tiers"
  on "public"."tiers"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can delete tiers"
  on "public"."tiers"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can update tiers"
  on "public"."tiers"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());



  create policy "admins can delete underground sites"
  on "public"."underground_sites"
  as permissive
  for delete
  to authenticated
using (public.is_admin_user());



  create policy "admins can manage underground sites"
  on "public"."underground_sites"
  as permissive
  for insert
  to authenticated
with check (public.is_admin_user());



  create policy "admins can update underground sites"
  on "public"."underground_sites"
  as permissive
  for update
  to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());


CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER extracted_records_set_updated_at BEFORE UPDATE ON public.extracted_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER open_air_sites_set_updated_at BEFORE UPDATE ON public.open_air_sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER processing_jobs_set_updated_at BEFORE UPDATE ON public.processing_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER site_commodity_metrics_set_updated_at BEFORE UPDATE ON public.site_commodity_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER site_data_set_updated_at BEFORE UPDATE ON public.site_data FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER site_facts_set_updated_at BEFORE UPDATE ON public.site_facts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER site_water_metrics_set_updated_at BEFORE UPDATE ON public.site_water_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sites_set_updated_at BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER underground_sites_set_updated_at BEFORE UPDATE ON public.underground_sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


