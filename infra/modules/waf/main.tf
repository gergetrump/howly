locals {
  managed_rules = [
    { name = "AWSManagedRulesAmazonIpReputationList", priority = 10 },
    { name = "AWSManagedRulesCommonRuleSet", priority = 20 },
    { name = "AWSManagedRulesKnownBadInputsRuleSet", priority = 30 },
    { name = "AWSManagedRulesSQLiRuleSet", priority = 40 },
  ]
}

resource "aws_wafv2_web_acl" "this" {
  name  = var.name
  scope = var.scope

  default_action {
    allow {}
  }

  dynamic "rule" {
    for_each = local.managed_rules

    content {
      name     = rule.value.name
      priority = rule.value.priority

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = rule.value.name
          vendor_name = "AWS"

          dynamic "rule_action_override" {
            for_each = var.allow_large_bodies && rule.value.name == "AWSManagedRulesCommonRuleSet" ? [1] : []

            content {
              name = "SizeRestrictions_BODY"

              action_to_use {
                count {}
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = rule.value.name
        sampled_requests_enabled   = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = var.name
    sampled_requests_enabled   = true
  }
}
