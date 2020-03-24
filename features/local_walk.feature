Feature: Local walk
    In order to find documents within a loaded json-ld document
    I should be able to execute a simple ld-query
    So that I can find nodes which exist in the current document

    Background: Load local walk data
        Given a walk context "basic"
        And the api "http://test.com/local-walk"

    Scenario: a property at the root of the document
        When I walk to "catalog"
        And I query the result for "> @id"
        Then the result should be "http://test.com/local-walk/catalog"

    Scenario: a property nested within the document
        When I walk to "department products"
        And I query the result for "> @id"
        Then the result should be "http://test.com/local-walk/department/products"