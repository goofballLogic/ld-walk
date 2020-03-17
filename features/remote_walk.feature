Feature: Local walk
    In order to find a document which might require unknown API calls
    I should be able to execute a walk through distributed documents
    So that I don't need to know the shape of the API

    Background: Load remote walk data
        Given a walk context "remote-walk"
        And the api "http://test.com/remote-walk"

    Scenario: the @id of a document one hop away
        When I walk to "catalog groceries fruit"
        And I query the result for "> @id"
        Then the result should be "http://test.com/remote-walk/catalog/fruit"

    Scenario: the name of a document two hops away
        When I walk to "catalog groceries fruit"
        And I query the result for "> name @value"
        Then the result should be "Fruit"