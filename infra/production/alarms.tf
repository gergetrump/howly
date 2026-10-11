resource "aws_sns_topic" "ops" {
  name              = "howly-ops"
  kms_master_key_id = module.kms_primary.arn
}

resource "aws_sns_topic" "ops_standby" {
  provider = aws.standby

  name              = "howly-ops"
  kms_master_key_id = module.kms_standby.arn
}

resource "aws_sns_topic_policy" "ops" {
  arn = aws_sns_topic.ops.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudWatch"
        Effect    = "Allow"
        Principal = { Service = "cloudwatch.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.ops.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "AllowBudgets"
        Effect    = "Allow"
        Principal = { Service = "budgets.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.ops.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      },
    ]
  })
}

resource "aws_sns_topic_policy" "ops_standby" {
  provider = aws.standby
  arn      = aws_sns_topic.ops_standby.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudWatch"
      Effect    = "Allow"
      Principal = { Service = "cloudwatch.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.ops_standby.arn
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
      }
    }]
  })
}

resource "aws_sns_topic_subscription" "ops_email" {
  count = var.alarm_email == "" ? 0 : 1

  topic_arn = aws_sns_topic.ops.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_sns_topic_subscription" "ops_standby_email" {
  provider = aws.standby
  count    = var.alarm_email == "" ? 0 : 1

  topic_arn = aws_sns_topic.ops_standby.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_budgets_budget" "monthly" {
  name         = "howly-production"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_sns_topic_arns = [aws_sns_topic.ops.arn]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.ops.arn]
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_healthy" {
  alarm_name          = "howly-api-healthy-hosts"
  comparison_operator = "LessThanThreshold"
  threshold           = 2
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.ops.arn]
  ok_actions          = [aws_sns_topic.ops.arn]
  # Failover leaves this alarm in ALARM so the primary record stays failed.
  # Notifications stop; the alarm state is what Route 53 reads.
  actions_enabled     = !var.enable_region_failover

  dimensions = {
    LoadBalancer = aws_lb.api.arn_suffix
    TargetGroup  = aws_lb_target_group.api.arn_suffix
  }
}

# Checks the load balancer's healthy targets. An HTTPS check of the load balancer
# DNS name fails certificate matching, and a check of api.<domain> would check the
# failover name itself.
resource "aws_route53_health_check" "api" {
  type                            = "CLOUDWATCH_METRIC"
  cloudwatch_alarm_name           = aws_cloudwatch_metric_alarm.alb_healthy.alarm_name
  cloudwatch_alarm_region         = var.aws_region
  insufficient_data_health_status = "Unhealthy"
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy" {
  alarm_name          = "howly-api-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.ops.arn]

  dimensions = {
    LoadBalancer = aws_lb.api.arn_suffix
    TargetGroup  = aws_lb_target_group.api.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "howly-api-target-5xx"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 10
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.ops.arn]

  dimensions = {
    LoadBalancer = aws_lb.api.arn_suffix
    TargetGroup  = aws_lb_target_group.api.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "api_tasks" {
  alarm_name          = "howly-api-running-tasks"
  comparison_operator = "LessThanThreshold"
  threshold           = 2
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Minimum"
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.ops.arn]
  actions_enabled     = !var.enable_region_failover

  dimensions = {
    ClusterName = aws_ecs_cluster.this.name
    ServiceName = aws_ecs_service.api.name
  }
}

resource "aws_cloudwatch_metric_alarm" "mongo_status" {
  count = 3

  alarm_name          = "howly-mongo-${count.index}-status"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  alarm_actions       = [aws_sns_topic.ops.arn]

  dimensions = {
    InstanceId = aws_instance.mongo[count.index].id
  }
}

resource "aws_cloudwatch_metric_alarm" "mongo_disk" {
  count = 3

  alarm_name          = "howly-mongo-${count.index}-disk"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 80
  evaluation_periods  = 2
  metric_name         = "DiskUsedPercent"
  namespace           = "Howly/Mongo"
  period              = 60
  statistic           = "Maximum"
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.ops.arn]

  dimensions = {
    InstanceId = aws_instance.mongo[count.index].id
  }
}

resource "aws_cloudwatch_metric_alarm" "mongo_container" {
  count = 3

  alarm_name          = "howly-mongo-${count.index}-container"
  comparison_operator = "LessThanThreshold"
  threshold           = 1
  evaluation_periods  = 2
  metric_name         = "ContainerRunning"
  namespace           = "Howly/Mongo"
  period              = 60
  statistic           = "Minimum"
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.ops.arn]

  dimensions = {
    InstanceId = aws_instance.mongo[count.index].id
  }
}

resource "aws_cloudwatch_metric_alarm" "mongo_standby_status" {
  provider = aws.standby

  alarm_name          = "howly-mongo-3-status"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  alarm_actions       = [aws_sns_topic.ops_standby.arn]

  dimensions = {
    InstanceId = aws_instance.mongo_standby.id
  }
}

resource "aws_cloudwatch_metric_alarm" "mongo_standby_disk" {
  provider = aws.standby

  alarm_name          = "howly-mongo-3-disk"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 80
  evaluation_periods  = 2
  metric_name         = "DiskUsedPercent"
  namespace           = "Howly/Mongo"
  period              = 60
  statistic           = "Maximum"
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.ops_standby.arn]

  dimensions = {
    InstanceId = aws_instance.mongo_standby.id
  }
}

resource "aws_cloudwatch_metric_alarm" "mongo_standby_container" {
  provider = aws.standby

  alarm_name          = "howly-mongo-3-container"
  comparison_operator = "LessThanThreshold"
  threshold           = 1
  evaluation_periods  = 2
  metric_name         = "ContainerRunning"
  namespace           = "Howly/Mongo"
  period              = 60
  statistic           = "Minimum"
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.ops_standby.arn]

  dimensions = {
    InstanceId = aws_instance.mongo_standby.id
  }
}
