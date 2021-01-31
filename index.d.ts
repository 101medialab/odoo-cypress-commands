/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        odooLogin(): Chainable<Element>;
        odooSwitchCompany(companyName: string);
        odooGoToApp(name: string): Chainable<Element>;
        odooGoToPage(section: string, subSection?: string, skipBreadcrumbChecking?: boolean): Chainable<Element>;
        odooGoToPreviousSiblingResource(): Chainable<Element>;
        odooGoToNextSiblingResource(): Chainable<Element>;

        odooInput(keyValue: { [key: string]: any }, clearFieldBeforeInput?: boolean): Chainable<Element>;

        odooGetTableInCurrentTab<S = any>(): Chainable<S>;
        odooInsertRowsInCurrentTab(buttonToAddNewLine: string, keyValue: {[key: string]: any}, skipDuplicated?: boolean): Chainable<Element>;
        odooAllTableRowsMatchValues(valuesToMatchArray: { [key: string]: any }[]): Chainable<Element>;
        odooGetTableRowThatMatchesValues(valuesToMatch: { [key: string]: any }): Chainable<Element>;
        odooUpdateTableRowThatMatchesValues(valuesToMatch: { [key: string]: any }, dataToInput?: { [key: string]: any }): Chainable<Element>;

        odooGetContent<S = any>(): Chainable<S>;
        odooGetBreadcrumb<S = any>(): Chainable<S>;
        odooGetControlPanel<S = any>(): Chainable<S>;
        odooGetStatusBarButtons<S = any>(visibleOnly?: boolean): Chainable<S>;
        odooGetStatusBarStates<S = any>(): Chainable<S>;
        odooGetRelatedPages<S = any>(): Chainable<S>;
        odooGetTitleSection<S = any>(): Chainable<S>;
        odooGetUpperSection<S = any>(): Chainable<S>;
        odooGetTabs<S = any>(): Chainable<S>;
        odooGetCurrentTabContent<S = any>(): Chainable<S>;
        odooGetModal<S = any>(): Chainable<S>;
        odooGetHistory<S = any>(): Chainable<S>;
    }
}
