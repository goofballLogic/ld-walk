Feature: Walk and query
    In order to conduct walks from intermediary stopping points
    I should be able to walk from the previous stopping point
    So that I can proceed to a new location

    Background: Load local walk data
        Given a walk context "walk-then-walk"
        And the api "http://test.com/local-walk"

    Scenario: a property nested within the document
        When I walk to "department"
        And I continue walking to "products"
        And I query the result for "@id"
        Then the result should be "http://test.com/local-walk/department/products"