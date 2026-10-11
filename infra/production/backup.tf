resource "aws_iam_role" "backup" {
  name = "howly-backup"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "backup.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

resource "aws_backup_vault" "mongo" {
  name        = "howly-mongo"
  kms_key_arn = module.kms_primary.arn

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_backup_vault" "mongo_standby" {
  provider = aws.standby

  name        = "howly-mongo"
  kms_key_arn = module.kms_standby.arn

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_backup_vault_policy" "mongo_standby" {
  provider = aws.standby

  backup_vault_name = aws_backup_vault.mongo_standby.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
      Action    = ["backup:CopyIntoBackupVault"]
      Resource  = "*"
    }]
  })
}

resource "aws_backup_plan" "mongo" {
  name = "howly-mongo"

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.mongo.name
    schedule          = "cron(0 3 * * ? *)"
    start_window      = 60
    completion_window = 180

    lifecycle {
      delete_after = 7
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.mongo_standby.arn

      lifecycle {
        delete_after = 7
      }
    }
  }
}

resource "aws_backup_selection" "mongo" {
  name         = "howly-mongo"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.mongo.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "howly-mongo"
  }
}

resource "aws_backup_plan" "mongo_standby" {
  provider = aws.standby
  name     = "howly-mongo"

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.mongo_standby.name
    schedule          = "cron(0 3 * * ? *)"
    start_window      = 60
    completion_window = 180

    lifecycle {
      delete_after = 7
    }
  }
}

resource "aws_backup_selection" "mongo_standby" {
  provider = aws.standby

  name         = "howly-mongo"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.mongo_standby.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "howly-mongo"
  }
}
