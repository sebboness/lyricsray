resource "aws_dynamodb_table" "analysis_results" {
    name = "${local.app}-${local.env}-analysis-results"
    billing_mode = "PAY_PER_REQUEST"

    attribute {
        name = "songKey"
        type = "S"
    }

    attribute {
      name = "entityType"
      type = "S"
    }

    attribute {
      name = "date"
      type = "S"
    }

    attribute {
      name = "artistKey"
      type = "S"
    }

    hash_key = "songKey"

    # Global Secondary Index for querying recent analyses
    global_secondary_index {
      name            = "RecentAnalysesIndex"
      hash_key        = "entityType"
      range_key       = "date"
      projection_type = "ALL"
    }

    # Global Secondary Index for querying all analyses by artist
    global_secondary_index {
      name            = "ArtistAnalysesIndex"
      hash_key        = "artistKey"
      range_key       = "date"
      projection_type = "ALL"
    }
}

resource "aws_dynamodb_table" "analytics_events" {
    name         = "${local.app}-${local.env}-analytics-events"
    billing_mode = "PAY_PER_REQUEST"

    attribute {
        name = "eventId"
        type = "S"
    }

    attribute {
        name = "date"
        type = "S"
    }

    attribute {
        name = "timestamp"
        type = "S"
    }

    hash_key = "eventId"

    global_secondary_index {
        name            = "AnalyticsEventsByDate"
        hash_key        = "date"
        range_key       = "timestamp"
        projection_type = "ALL"
    }

    ttl {
        attribute_name = "ttl"
        enabled        = true
    }
}

resource "aws_dynamodb_table" "daily_stats" {
    name         = "${local.app}-${local.env}-daily-stats"
    billing_mode = "PAY_PER_REQUEST"

    attribute {
        name = "date"
        type = "S"
    }

    hash_key = "date"
}

resource "aws_dynamodb_table" "analysis_rate_limits" {
    name = "${local.app}-${local.env}-analysis-rate-limits"
    billing_mode = "PAY_PER_REQUEST"

    attribute {
        name = "id"
        type = "S"
    }

    hash_key = "id"
}