# Partial backend. Copy infra/bootstrap output into backend.hcl, then:
#   terraform init -backend-config=backend.hcl
# Validate without a live backend:
#   terraform init -backend=false && terraform validate

terraform {
  backend "s3" {}
}
