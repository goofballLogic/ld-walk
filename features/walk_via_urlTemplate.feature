Feature: Walk via urlTemplate
    In order to step through a graph of nodes by traversing a template
    I should be able to supply a property and arguments for the template
    So that ld-walk can transition through a dynamic link

    Background: Load local walk data
        Given a walk context "basic"
        And a query context "schema.org"
        And the api "http://test.com/collection-walk"

    Scenario: Walk using the viaTemplate method
        When I walk to "things"
        And I walk via template "urlTemplate"
            | args                  |
            | { itemId: "oranges" } |
        And I query the result for "@id"
        Then the result should be "http://test.com/collection-walk/oranges"


    Scenario: Walk using the inline template method
        When I walk to
            | Parts                                    |
            | things                                   |
            | template[ urlTemplate, { "itemId": "oranges" }] |
        And I query the result for "@id"
        Then the result should be "http://test.com/collection-walk/oranges"