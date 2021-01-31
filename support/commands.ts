import Chainable = Cypress.Chainable;

Cypress.Commands.add('odooLogin', () => {
    cy.visit('http://localhost:8069/web/login');
    cy.get('#login').type('admin');
    cy.get('#password').type('admin');
    cy.get('form').submit();
});

Cypress.Commands.add('odooSwitchCompany', (companyName: string) => {
    cy.get('.o_switch_company_menu div[role="button"]').contains(companyName).click({force: true}).wait(2000);
});

Cypress.Commands.add('odooGoToApp', (name) => {
    cy.visit('http://localhost:8069/web').wait(1000);
    cy.get('.o_menu_apps').click().contains(name).click();
    cy.get('.o_menu_brand').should('contain', name);
});

// Navigate to section and pages under an application via top nav bar and sub menu
Cypress.Commands.add('odooGoToPage', (section: string, subSection?: string, skipBreadcrumbChecking?: boolean) => {
    cy.get('.o_menu_sections > li > a').contains(section).click();

    if (subSection) {
        cy.get('.o_menu_sections .dropdown-menu.show').contains(subSection).click();
    }

    if (!skipBreadcrumbChecking) {
        cy.odooGetBreadcrumb().should('contain', subSection || section);
    }
});

// Inside resource view page, we can go to previous and next sibling resource by `<` / `>` buttons on the top right hand corner
Cypress.Commands.add('odooGoToPreviousSiblingResource', () => {
    cy.get('.o_control_panel .o_pager_previous').click();
});

Cypress.Commands.add('odooGoToNextSiblingResource', () => {
    cy.get('.o_control_panel .o_pager_next').click();
});

// Form control
Cypress.Commands.add('odooInput', { prevSubject: true }, ($target, keyValue: { [key: string]: any }, clearFieldBeforeInput: boolean = true) => {
    for (const key in keyValue) {
        const value = keyValue[key];

        if (typeof value === 'object' && !(value instanceof Array)) {
            // Create a new object in modal and set it in field if value of this field is object
            cy.wrap($target).find(`div[name="${ key }"] input`).click().type('Something');
            cy.get('.ui-autocomplete:visible').contains('Create and Edit').click();

            cy.odooGetModal().should('exist');

            cy.odooGetModal().odooInput(value, clearFieldBeforeInput);
            cy.odooGetModal().contains('Save').click();

            cy.odooGetModal().should('not.exist').wait(300);

            continue;
        }

        const $targetInput = $target.find('.o_input[name="' + key + '"]');

        if ($targetInput.is('input')) {
            // Direct input field
            // TODO: support checkbox and radio button later when needed
            cy.wrap($target).find('input[name="' + key + '"]').type((clearFieldBeforeInput ? '{selectall}' : '') + keyValue[key])
            continue;
        } else if ($targetInput.is('select')) {
            cy.wrap($targetInput).select(keyValue[key]);
            continue;
        }

        if ($target.find('div.o_field_many2one[name="' + key + '"]').length) {
            // Many to one autocomplete field
            let values = keyValue[key];

            if (!(keyValue[key] instanceof Array)) {
                values = [keyValue[key]];
            }

            values.forEach(each => {
                cy.get(`${ $target.selector } div.o_field_many2one[name="${ key }"] input.o_input`).type((clearFieldBeforeInput ? '{selectall}' : '') + each);

                // Need to sleep 500 ms here
                cy.get('.ui-autocomplete:visible').contains(each).click().wait(500);
            });

            continue;
        }

        let inputSelector = 'div.o_field_radio[name="' + key + '"] input[data-value="' + keyValue[key] + '"]';
        if ($target.find(inputSelector).length) {
            // Radio or checkbox input
            cy.wrap($target).get(inputSelector).click({ force: true });
        } else if ($target.find('div.o_field_widget[name="' + key + '"]').length) {
            // Direct input field with autocomplete, presents in title section
            cy.wrap($target).find('div.o_field_widget[name="' + key + '"] input').type((clearFieldBeforeInput ? '{selectall}' : '') + keyValue[key])
        }
    }
});

// Table commands
Cypress.Commands.add('odooGetTableInCurrentTab', () => cy.odooGetCurrentTabContent().find('.o_field_widget:not(.o_invisible_modifier) .o_list_table'));
Cypress.Commands.add('odooInsertRowsInCurrentTab', (buttonToAddNewLine: string, keyValues: { [key: string]: any }[], skipDuplicated: boolean = false) => {
    keyValues.forEach((keyValue) => {
        cy.odooGetTableInCurrentTab().then(($target) => {
            let insertable = true;

            if (skipDuplicated) {
                insertable = false;
                try {
                    getTableRowThatMatchesValues($target, keyValue)
                } catch (e) {
                    // getTableRowThatMatchesValues will throw exception if it cannot find row with all values matched
                    // i.e. no duplicated row found and we are safe to insert this row
                    insertable = true;
                }
            }

            if (insertable) {
                // Very difficult to ensure new row has been added and .o_selected_row is pointing to newly added row. Wait for 500 ms to avoid such issue
                cy.odooGetTableInCurrentTab().find('td.o_field_x2many_list_row_add').contains(buttonToAddNewLine).click().wait(500);
                cy.odooGetTableInCurrentTab().get('.o_selected_row').odooInput(keyValue);
            }
        });
    });
});

// Check if all rows match target values correspondingly
Cypress.Commands.add('odooAllTableRowsMatchValues', { prevSubject: true }, ($target, valuesToMatchArray: { [key: string]: string }[]) => {
    valuesToMatchArray.map((valuesToMatch) => {
        cy.wrap($target).odooGetTableRowThatMatchesValues(valuesToMatch);
    });
});

function getTableRowThatMatchesValues($target, valuesToMatch: { [key: string]: string }) {
    const rowSelector = `tr${ Object.values(valuesToMatch).map(____ => `:contains("${ ____ }")`).join('') }`;

    const $targetRows = $target.find(rowSelector);

    if (!$targetRows.length) {
        // Something went wrong causing elements targeting failed, log for checking
        console.log($target, rowSelector, $targetRows);

        throw new Error('Target row not found. valuesToMatch: ' + JSON.stringify(valuesToMatch));
    }

    const matchedRows = [];

    for (let targetRow of $targetRows) {
        let isRowMatched = true;
        const $targetRow = Cypress.$(targetRow);

        for (const key in valuesToMatch) {
            const nthChild = $target.find(`th[data-name="${ key }"]`).index() + 1;

            if (nthChild === 0) {
                throw new Error(`${ key } does not exist in table header.`);
            }

            if ($targetRow.find(`td:nth-child(${ nthChild }):contains("${ valuesToMatch[key] }")`).length === 0) {
                isRowMatched = false;
            }
        }

        if (isRowMatched) {
            matchedRows.push($targetRow);
        }
    }

    if (matchedRows.length === 1) {
        return matchedRows[0];
    }

    // We have abnormal result here, log for checking
    console.log($targetRows);

    if (matchedRows.length > 1) {
        throw new Error(`Found more than one row exactly matched`);
    }

    throw new Error(`Found similar rows but not exactly matched`);
}

// Select single row in table that all columns inside that row matches target values correspondingly
Cypress.Commands.add('odooGetTableRowThatMatchesValues', { prevSubject: true },
    ($target, valuesToMatch: { [key: string]: string }) => {
        return cy.wrap(getTableRowThatMatchesValues($target, valuesToMatch));
    }
);

Cypress.Commands.add('odooUpdateTableRowThatMatchesValues', { prevSubject: true },
    ($target, valuesToMatch: { [key: string]: string }, dataToInput: { [key: string]: string }) => {
        cy.wrap($target).odooGetTableRowThatMatchesValues(valuesToMatch).click();

        // We need to wait for Odoo to replace table row for displaying purpose to another that is editable
        cy.wait(500);

        // Chaining odooInput will not work as when clicked on target row, target row will be replaced with an editable row
        cy.wrap($target).odooGetTableRowThatMatchesValues(valuesToMatch).odooInput(dataToInput);
    }
);

// Select elements
Cypress.Commands.add('odooGetContent', () => cy.get('.o_content'));

Cypress.Commands.add('odooGetBreadcrumb', () => cy.get('.breadcrumb'));

// Control Panel is the header of a page inside an application
//
// In list page it contains:
//  - 'Create', 'Import' buttons etc.
//  - Search panel
//  - View switching buttons
//
// In view page it contains:
//  - Left:     'Save', 'Discard' buttons etc.
//  - Center:   Action menu which contains 'Delete' and 'Duplicate' buttons etc. inside
//  - Right:    Browse to sibling records button
Cypress.Commands.add('odooGetControlPanel', () => cy.get('.o_control_panel'));

// Under Control panel is status bar
// It contains 2 parts:
//  - Left:     Action buttons
//  - Right:    Model status
Cypress.Commands.add('odooGetStatusBarButtons', (visibleOnly: boolean = true) => cy.get('.o_form_statusbar button' + (visibleOnly ? ':visible' : '')));
Cypress.Commands.add('odooGetStatusBarStates', () => cy.get('.o_form_statusbar .o_statusbar_status'));

// Inside resource view page, there is a list of large buttons on top right hand corner
Cypress.Commands.add('odooGetRelatedPages', () => cy.get('.oe_button_box button'));

Cypress.Commands.add('odooGetTitleSection', () => cy.odooGetContent().find('.o_form_sheet .oe_title'));
Cypress.Commands.add('odooGetUpperSection', () => cy.odooGetContent().find('.o_form_sheet .o_group'));

// Notebook tab is any tab panel
Cypress.Commands.add('odooGetTabs', () => cy.get('.o_notebook .o_notebook_headers .nav-item'));
Cypress.Commands.add('odooGetCurrentTabContent', () => cy.odooGetContent().find('.tab-pane.active'));

Cypress.Commands.add('odooGetModal', () => cy.get('.modal.show .modal-dialog'));

Cypress.Commands.add('odooGetHistory', () => cy.get('.o_MessageList'));
