Feature: Walk and query
    In order to query the document found by walking
    I should be able to suply a query context
    So that I can query nodes normal ld-query aliases

    Background: Load local walk data
        Given a walk context "walk-then-query"
        And a query context "schema.org"
        And the api "http://test.com/local-walk"

    Scenario: a property nested within the document
        When I walk to "department products"
        And I query the result for "so:name @value"
        Then the result should be "Products"