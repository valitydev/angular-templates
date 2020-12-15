import { css, html, StructureTemplate, TemplateObject } from "genry";
import { camelCase, kebabCase, upperFirst } from "lodash";

enum ComponentPart {
    template,
    style,
    theme,
}

enum Type {
    module,
    partOfModule,
}

enum PartType {
    component,
    service,
    pipe,
}

function createComponentTemplate(
    prefix: string,
    name: string,
    componentParts: ComponentPart[]
) {
    const filename = kebabCase(name);
    const selector = kebabCase(`${prefix}-${name}`);
    const className = upperFirst(camelCase(name));

    const hasStyle = componentParts.includes(ComponentPart.style);
    const hasTheme = componentParts.includes(ComponentPart.theme);
    const hasTemplate = componentParts.includes(ComponentPart.template);

    const children: StructureTemplate[] = [];

    const componentTemplateContent = html`
        ${hasTheme ? `<div class="${selector}">` : ""}
        <ng-content></ng-content>
        ${hasTheme ? `</div>` : ""}
    `;

    children.push({
        path: `${filename}.component.ts`,
        content: `
            import { ChangeDetectionStrategy, Component } from '@angular/core';

            @Component({
                ${[
                    `selector: '${selector}',`,
                    `templateUrl: ${
                        hasTemplate
                            ? `'${filename}.component.html'`
                            : `\`${componentTemplateContent}\``
                    },`,
                    hasStyle && `styleUrls: ['${filename}.component.scss'],`,
                    "changeDetection: ChangeDetectionStrategy.OnPush,",
                ]
                    .filter((v) => v)
                    .join("\n")}
            })
            export class ${className}Component {}
        `,
    });

    if (hasStyle) {
        children.push({
            path: `${filename}.component.scss`,
            content: css`
                :host {
                    ${hasTheme ? `.${selector} {}` : ""}
                }
            `,
        });
    }
    if (hasTheme) {
        children.push({
            path: `_${filename}-theme.scss`,
            content: css`
                @import "~@angular/material/theming";

                @mixin ${selector}-theme ($theme) {
                    .${selector} {
                    }
                }

                @mixin ${selector}-typography ($config) {
                    .${selector} {
                    }
                }
            `,
        });
    }
    if (hasTemplate) {
        children.push({
            path: `${filename}.component.html`,
            content: componentTemplateContent,
        });
    }

    return children;
}

export default [
    { name: "Create module", value: Type.module },
    { name: "Create part of module", value: Type.partOfModule },
].map(
    ({ name, value }): TemplateObject => ({
        name,
        description: "Angular",
        questions: [
            {
                type: "text",
                name: "name",
                message: "Name",
            },
            {
                type: "select",
                name: "partType",
                message: "Module type",
                choices: [
                    {
                        title: "Component",
                        value: PartType.component,
                    },
                    {
                        title: "Service",
                        value: PartType.service,
                    },
                    {
                        title: "Pipe",
                        value: PartType.pipe,
                    },
                ],
            },
            {
                type: (_, { partType }) =>
                    partType === PartType.component ? "multiselect" : null,
                name: "componentParts",
                message: "Pick component parts",
                choices: [
                    {
                        title: "Template",
                        value: ComponentPart.template,
                        selected: true,
                    },
                    {
                        title: "Style",
                        value: ComponentPart.style,
                    },
                    {
                        title: "Theme",
                        value: ComponentPart.theme,
                    },
                ] as any,
            },
        ],
        template: (
            { name, componentParts, partType },
            { template: { prefix } }
        ) => {
            const filename = kebabCase(name);
            const camelCaseName = camelCase(name);
            const className = upperFirst(camelCaseName);
            const partNameByPartType = {
                [PartType.component]: "component",
                [PartType.service]: "service",
                [PartType.pipe]: "pipe",
            };
            const partClassName = `${className}${upperFirst(
                partNameByPartType[partType]
            )}`;
            const partFilename = `${filename}.${partNameByPartType[partType]}`;
            const partImport = `import {${partClassName}} from './${partFilename}';`;
            const partExport = `export * from './${partFilename}';`;

            const children: StructureTemplate[] = [];

            switch (partType) {
                case PartType.component:
                    children.push(
                        ...createComponentTemplate(prefix, name, componentParts)
                    );
                    children.push({
                        path: `${partFilename}.spec.ts`,
                        content: `
                                import { Component, DebugElement } from '@angular/core';
                                import { ComponentFixture, TestBed } from '@angular/core/testing';
                                import { By } from '@angular/platform-browser';

                                ${partImport}
    
                                @Component({
                                    selector: 'dsh-host',
                                    template: \`<dsh-${filename}></dsh-${filename}>\`,
                                })
                                class HostComponent {}

                                describe('${partClassName}', () => {
                                    let fixture: ComponentFixture<HostComponent>;
                                    let debugElement: DebugElement;
                                    let component: ${partClassName};

                                    beforeEach(async () => {
                                        await TestBed.configureTestingModule({
                                            imports: [],
                                            declarations: [HostComponent, ${partClassName}]
                                        }).compileComponents();

                                        fixture = TestBed.createComponent(HostComponent);
                                        debugElement = fixture.debugElement.query(By.directive(${partClassName}));
                                        component = debugElement.componentInstance;

                                        fixture.detectChanges();
                                    });

                                    it('should be created', () => {
                                        expect(service).toBeTruthy();
                                    });

                                    describe('methods', () => {
                                    });

                                    describe('template', () => {
                                    });
                                });
                            `,
                    });
                    break;
                case PartType.service:
                    children.push({
                        path: `${partFilename}.ts`,
                        content: `
                                import { Injectable } from '@angular/core';
    
                                @Injectable()
                                export class ${partClassName} {
                                    constructor() {}
                                }
                            `,
                    });
                    break;
                case PartType.pipe:
                    children.push({
                        path: `${partFilename}.ts`,
                        content: `
                                import { Pipe, PipeTransform } from '@angular/core';
    
                                @Pipe({name: '${camelCaseName}'})
                                export class ${partClassName} implements PipeTransform {
                                    transform(value: string) {
                                        return value;
                                    }
                                }
                            `,
                    });
                    children.push({
                        path: `${partFilename}.spec.ts`,
                        content: `
                                import { TestBed } from '@angular/core/testing';

                                ${partImport}
    
                                describe('${partClassName}', () => {
                                    let service: ${partClassName};

                                    beforeEach(() => {
                                        TestBed.configureTestingModule({
                                            imports: [],
                                            providers: [
                                                ${partClassName}
                                            ],
                                        });

                                        service = TestBed.inject(${partClassName});
                                    });

                                    it('should be created', () => {
                                        expect(service).toBeTruthy();
                                    });

                                    describe('methods', () => {
                                    });
                                });
                            `,
                    });
                    break;
            }
            if (value === Type.module) {
                children.push({
                    path: `${filename}.module.ts`,
                    content: `
                            import { NgModule } from '@angular/core';

                            ${partImport}
                            
                            @NgModule({
                                imports: [],
                                declarations: [${
                                    partType !== PartType.service
                                        ? partClassName
                                        : ""
                                }],
                                exports: [${
                                    partType !== PartType.service
                                        ? partClassName
                                        : ""
                                }],
                                providers: [${
                                    partType === PartType.service
                                        ? partClassName
                                        : ""
                                }]
                            })
                            export class ${className}Module {}
                        `,
                });
                children.push({
                    path: `index.ts`,
                    content: `
                        ${partExport}
                        export * from './${filename}.module'
                    `,
                });
            }

            return [
                {
                    path: filename,
                    children,
                },
            ];
        },
    })
);
