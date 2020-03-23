Feature: Walk and query
    In order to conduct walks via collections
    I should be able to specify a query as part of a walk path
    So that I can proceed to a new location

    Background: Load local walk data
        Given a walk context "walk-and-query"
        And the api "http://test.com/collection-walk"

    Scenario: a property nested within the document
        When I walk to
            | Parts                                   |
            | things                                  |
            | query[name[@value=Some oranges]] |
        And I query the result for "@id"
        Then the result should be "http://test.com/collection-walk/oranges"