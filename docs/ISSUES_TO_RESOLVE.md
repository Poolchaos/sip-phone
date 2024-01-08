## Multiple Aurelia Dialogs (Wrap Up and Not Responding)

Scenario: Use is in already in Not Responding state (due to not refreshing on Conversations side). They then make an outbound call, and additional have a wrap up.

It is possible for the user to end up in a Not Responding and Wrap Up state.

In this case, we'd present dialogs Not Responding dialog to user in the following scenarios:

1. On Open Phone (from extension) (with wrapUp and notResponding both true):
    * display notResponding Dialog
1. On Phone already open (with existing wrapUp = true)


