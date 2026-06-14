-- ระบบจัดเก็บและตรวจสอบครุภัณฑ์องค์กรนักศึกษา
-- PostgreSQL / Supabase schema พร้อมข้อมูลตั้งต้น organizations

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  organization_name varchar(255) not null,
  organization_type varchar(100) not null,
  parent_unit varchar(255),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organizations_name_unique unique (organization_name),
  constraint organizations_type_check check (
    organization_type in ('สโมสรนักศึกษา', 'สภานักศึกษา', 'ฝ่าย', 'ชมรม', 'ชมรมจังหวัด', 'อื่น ๆ')
  )
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  email varchar(255) not null,
  password text not null,
  role varchar(50) not null default 'เจ้าหน้าที่',
  organization_id uuid references organizations(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint users_email_unique unique (email),
  constraint users_role_check check (
    role in ('ผู้ดูแลระบบ', 'เจ้าหน้าที่', 'ผู้ตรวจสอบ', 'ผู้ใช้งานทั่วไป')
  )
);

comment on column users.password is 'เก็บรหัสผ่านที่ผ่านการ hash แล้วเท่านั้น ห้ามเก็บ plain text password';

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  asset_code varchar(100) not null,
  asset_number varchar(100),
  asset_name varchar(255) not null,
  asset_description text,
  asset_type varchar(100) not null,
  fiscal_year integer not null,
  quantity integer not null default 1,
  unit varchar(50) not null default 'รายการ',
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(14, 2) generated always as (quantity * unit_price) stored,
  budget_source varchar(255),
  received_date date,
  storage_location varchar(255),
  building varchar(255),
  room varchar(100),
  organization_id uuid not null references organizations(id) on update cascade on delete restrict,
  main_responsible_unit varchar(255),
  responsible_person varchar(255),
  responsible_phone varchar(50),
  responsible_email varchar(255),
  status varchar(50) not null default 'พร้อมใช้งาน',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assets_asset_code_unique unique (asset_code),
  constraint assets_quantity_check check (quantity > 0),
  constraint assets_unit_price_check check (unit_price >= 0),
  constraint assets_fiscal_year_check check (fiscal_year >= 2561 and fiscal_year <= 9999),
  constraint assets_status_check check (
    status in ('พร้อมใช้งาน', 'รอตรวจสอบ', 'ชำรุด', 'สูญหาย', 'จำหน่าย', 'ยืมใช้งาน', 'ยกเลิก')
  )
);

comment on column assets.fiscal_year is 'ปีงบประมาณแบบพุทธศักราช เช่น 2561, 2567, 2568';

create table if not exists asset_images (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on update cascade on delete cascade,
  image_url text not null,
  image_type varchar(50) not null default 'ทั่วไป',
  uploaded_by uuid references users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),

  constraint asset_images_type_check check (
    image_type in ('ทั่วไป', 'หลักฐานรับเข้า', 'สภาพปัจจุบัน', 'ชำรุด', 'จำหน่าย', 'อื่น ๆ')
  )
);

create table if not exists annual_inspections (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on update cascade on delete cascade,
  inspection_year integer not null,
  inspection_date date not null default current_date,
  inspection_result varchar(50) not null,
  current_location varchar(255),
  inspector_name varchar(255) not null,
  inspector_user_id uuid references users(id) on update cascade on delete set null,
  evidence_image_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint annual_inspections_year_check check (inspection_year >= 2561 and inspection_year <= 9999),
  constraint annual_inspections_result_check check (
    inspection_result in ('พบครุภัณฑ์', 'ไม่พบครุภัณฑ์', 'ชำรุด', 'ย้ายสถานที่', 'รอตรวจซ้ำ', 'จำหน่ายแล้ว')
  ),
  constraint annual_inspections_asset_year_unique unique (asset_id, inspection_year)
);

comment on column annual_inspections.inspection_year is 'ปีงบประมาณที่ตรวจสอบแบบพุทธศักราช เช่น 2567, 2568';

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on update cascade on delete set null,
  action_type varchar(50) not null,
  target_table varchar(100) not null,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now(),

  constraint activity_logs_action_type_check check (
    action_type in ('สร้าง', 'แก้ไข', 'ลบ', 'เข้าสู่ระบบ', 'ออกจากระบบ', 'ตรวจสอบ', 'อัปโหลดรูป', 'ส่งออกรายงาน')
  ),
  constraint activity_logs_target_table_check check (
    target_table in ('assets', 'organizations', 'asset_images', 'annual_inspections', 'users', 'activity_logs')
  )
);

create trigger organizations_set_updated_at
before update on organizations
for each row execute function set_updated_at();

create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

create trigger assets_set_updated_at
before update on assets
for each row execute function set_updated_at();

create trigger annual_inspections_set_updated_at
before update on annual_inspections
for each row execute function set_updated_at();

insert into organizations (organization_name, organization_type, parent_unit)
values
  ('สโมสรนักศึกษา', 'สโมสรนักศึกษา', 'มหาวิทยาลัยเชียงใหม่'),
  ('สภานักศึกษา', 'สภานักศึกษา', 'มหาวิทยาลัยเชียงใหม่'),
  ('ฝ่ายวิชาการ', 'ฝ่าย', 'สโมสรนักศึกษา'),
  ('ฝ่ายศาสนาและศิลปวัฒนธรรม', 'ฝ่าย', 'สโมสรนักศึกษา'),
  ('ฝ่ายนักศึกษาสัมพันธ์และวิเทศสัมพันธ์', 'ฝ่าย', 'สโมสรนักศึกษา'),
  ('ฝ่ายจิตอาสาและบำเพ็ญประโยชน์', 'ฝ่าย', 'สโมสรนักศึกษา'),
  ('ชมรมถ่ายภาพมองภาพผ่านเลนส์', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมประชาธิปไตย', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมศิลปะและการออกแบบ', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมวรรณศิลป์', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมสิทธิมนุษยชน', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมTEDxChiangMaiU', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรม CMU OB Livestreaming', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมดนตรีสากล', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมคริสตชน', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมพุทธศิลปศึกษาและประเพณี', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมพื้นบ้านล้านนา', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษามุสลิม', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาอีสาน', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมส่งเสริมศิลปวัฒนธรรมปักษ์ใต้', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนาฏศิลป์และดนตรีไทย', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมการแสดง', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมดุริยางค์', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมขับร้องและประสานเสียง', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมผู้นำเชียร์แห่งมหาวิทยาลัยเชียงใหม่', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมโรตาแรคท์', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาชาติพันธุ์', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมเพื่อนผู้พิการ', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาวิชาทหาร', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษานานาชาติ', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาทุนตอบแทนคุณ', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมสันทนาการมหาวิทยาลัยเชียงใหม่', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษากรุงเทพ ฯ', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดสุโขทัย', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดพะเยา', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดพิจิตร', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดนครสวรรค์', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดลำพูน', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดแพร่', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมอนุรักษ์ธรรมชาติและสิ่งแวดล้อม', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรม TO BE NUMBER ONE', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมเด็กดีมีที่เรียน', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมรากแก้ว มหาวิทยาลัยเชียงใหม่', 'ชมรม', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดน่าน', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดเชียงราย', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดตาก', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดแม่ฮ่องสอน', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่'),
  ('ชมรมนักศึกษาจังหวัดลำปาง', 'ชมรมจังหวัด', 'มหาวิทยาลัยเชียงใหม่')
on conflict (organization_name) do update
set
  organization_type = excluded.organization_type,
  parent_unit = excluded.parent_unit,
  is_active = true,
  updated_at = now();

create index if not exists idx_organizations_type on organizations(organization_type);
create index if not exists idx_organizations_active on organizations(is_active);
create index if not exists idx_organizations_search on organizations using gin (
  to_tsvector('simple', organization_name || ' ' || organization_type || ' ' || coalesce(parent_unit, ''))
);

create index if not exists idx_users_organization_id on users(organization_id);
create index if not exists idx_users_role on users(role);

create index if not exists idx_assets_organization_id on assets(organization_id);
create index if not exists idx_assets_fiscal_year on assets(fiscal_year);
create index if not exists idx_assets_status on assets(status);
create index if not exists idx_assets_asset_type on assets(asset_type);
create index if not exists idx_assets_received_date on assets(received_date);
create index if not exists idx_assets_search on assets using gin (
  to_tsvector('simple', coalesce(asset_code, '') || ' ' || coalesce(asset_number, '') || ' ' || coalesce(asset_name, ''))
);

create index if not exists idx_asset_images_asset_id on asset_images(asset_id);
create index if not exists idx_asset_images_uploaded_by on asset_images(uploaded_by);

create index if not exists idx_annual_inspections_asset_id on annual_inspections(asset_id);
create index if not exists idx_annual_inspections_year on annual_inspections(inspection_year);
create index if not exists idx_annual_inspections_result on annual_inspections(inspection_result);
create index if not exists idx_annual_inspections_inspector_user_id on annual_inspections(inspector_user_id);

create index if not exists idx_activity_logs_user_id on activity_logs(user_id);
create index if not exists idx_activity_logs_target on activity_logs(target_table, target_id);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at desc);
