import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261022030413 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "expert_rule" drop constraint if exists "expert_rule_code_unique";`);
    this.addSql(`alter table if exists "expert_variable" drop constraint if exists "expert_variable_code_unique";`);
    this.addSql(`alter table if exists "expert_hypothesis" drop constraint if exists "expert_hypothesis_code_unique";`);
    this.addSql(`create table if not exists "expert_consultation" ("id" text not null, "customer_id" text null, "answers" jsonb not null, "facts" jsonb null, "trace" jsonb null, "budget" real null, "total_recommended" real null, "rating" integer null, "feedback" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "expert_consultation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_consultation_deleted_at" ON "expert_consultation" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "expert_hypothesis" ("id" text not null, "code" text not null, "name" text not null, "description" text not null, "kind" text check ("kind" in ('product', 'advice')) not null default 'product', "product_match" jsonb null, "usage" text null, "sort_order" integer not null default 0, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "expert_hypothesis_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_expert_hypothesis_code_unique" ON "expert_hypothesis" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_hypothesis_deleted_at" ON "expert_hypothesis" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "expert_consultation_result" ("id" text not null, "certainty" real not null, "status" text check ("status" in ('recommended', 'optional', 'rejected', 'advice')) not null, "rank" integer not null default 0, "product_ids" jsonb null, "selected_product_id" text null, "reasons" jsonb null, "consultation_id" text not null, "hypothesis_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "expert_consultation_result_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_consultation_result_consultation_id" ON "expert_consultation_result" ("consultation_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_consultation_result_hypothesis_id" ON "expert_consultation_result" ("hypothesis_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_consultation_result_deleted_at" ON "expert_consultation_result" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "expert_variable" ("id" text not null, "code" text not null, "name" text not null, "question" text null, "help" text null, "kind" text check ("kind" in ('input', 'derived')) not null default 'input', "input_type" text check ("input_type" in ('single', 'multi', 'number')) not null default 'single', "unit" text null, "min_value" real null, "max_value" real null, "sort_order" integer not null default 0, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "expert_variable_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_expert_variable_code_unique" ON "expert_variable" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_variable_deleted_at" ON "expert_variable" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "expert_rule" ("id" text not null, "code" text not null, "name" text not null, "conclusion_type" text check ("conclusion_type" in ('hypothesis', 'fact')) not null, "hypothesis_id" text null, "conclusion_variable_id" text null, "conclusion_value" text null, "certainty" real not null, "priority" integer not null default 0, "explanation" text not null, "source" text null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "expert_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_expert_rule_code_unique" ON "expert_rule" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_rule_hypothesis_id" ON "expert_rule" ("hypothesis_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_rule_conclusion_variable_id" ON "expert_rule" ("conclusion_variable_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_rule_deleted_at" ON "expert_rule" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "expert_rule_condition" ("id" text not null, "operator" text check ("operator" in ('eq', 'neq', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains')) not null, "value" text not null, "sort_order" integer not null default 0, "rule_id" text not null, "variable_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "expert_rule_condition_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_rule_condition_rule_id" ON "expert_rule_condition" ("rule_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_rule_condition_variable_id" ON "expert_rule_condition" ("variable_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_rule_condition_deleted_at" ON "expert_rule_condition" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "expert_variable_option" ("id" text not null, "value" text not null, "label" text not null, "sort_order" integer not null default 0, "variable_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "expert_variable_option_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_variable_option_variable_id" ON "expert_variable_option" ("variable_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_expert_variable_option_deleted_at" ON "expert_variable_option" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "expert_consultation_result" add constraint "expert_consultation_result_consultation_id_foreign" foreign key ("consultation_id") references "expert_consultation" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "expert_consultation_result" add constraint "expert_consultation_result_hypothesis_id_foreign" foreign key ("hypothesis_id") references "expert_hypothesis" ("id") on update cascade;`);

    this.addSql(`alter table if exists "expert_rule" add constraint "expert_rule_hypothesis_id_foreign" foreign key ("hypothesis_id") references "expert_hypothesis" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table if exists "expert_rule" add constraint "expert_rule_conclusion_variable_id_foreign" foreign key ("conclusion_variable_id") references "expert_variable" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "expert_rule_condition" add constraint "expert_rule_condition_rule_id_foreign" foreign key ("rule_id") references "expert_rule" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "expert_rule_condition" add constraint "expert_rule_condition_variable_id_foreign" foreign key ("variable_id") references "expert_variable" ("id") on update cascade;`);

    this.addSql(`alter table if exists "expert_variable_option" add constraint "expert_variable_option_variable_id_foreign" foreign key ("variable_id") references "expert_variable" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "expert_consultation_result" drop constraint if exists "expert_consultation_result_consultation_id_foreign";`);

    this.addSql(`alter table if exists "expert_consultation_result" drop constraint if exists "expert_consultation_result_hypothesis_id_foreign";`);

    this.addSql(`alter table if exists "expert_rule" drop constraint if exists "expert_rule_hypothesis_id_foreign";`);

    this.addSql(`alter table if exists "expert_rule" drop constraint if exists "expert_rule_conclusion_variable_id_foreign";`);

    this.addSql(`alter table if exists "expert_rule_condition" drop constraint if exists "expert_rule_condition_variable_id_foreign";`);

    this.addSql(`alter table if exists "expert_variable_option" drop constraint if exists "expert_variable_option_variable_id_foreign";`);

    this.addSql(`alter table if exists "expert_rule_condition" drop constraint if exists "expert_rule_condition_rule_id_foreign";`);

    this.addSql(`drop table if exists "expert_consultation" cascade;`);

    this.addSql(`drop table if exists "expert_hypothesis" cascade;`);

    this.addSql(`drop table if exists "expert_consultation_result" cascade;`);

    this.addSql(`drop table if exists "expert_variable" cascade;`);

    this.addSql(`drop table if exists "expert_rule" cascade;`);

    this.addSql(`drop table if exists "expert_rule_condition" cascade;`);

    this.addSql(`drop table if exists "expert_variable_option" cascade;`);
  }

}
