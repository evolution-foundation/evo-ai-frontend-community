import process from 'node:process';
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root = process.cwd();
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = walk(path.join(root, 'src')).filter(p => /\.[jt]sx?$/.test(p) && !/(?:\.spec\.|\.test\.|\.stories\.|\/__tests__\/|\/__mocks__\/|\/i18n\/locales\/|\/test\/|\/tests\/)/.test(p));
const catalogs = Object.fromEntries(['en', 'pt-BR'].map(lang => [lang, Object.fromEntries(walk(path.join(root, 'src/i18n/locales', lang)).filter(p => p.endsWith('.json')).map(p => [path.basename(p, '.json'), JSON.parse(fs.readFileSync(p, 'utf8'))]))]));
const at = (obj, key) => key.split('.').reduce((a, k) => a?.[k], obj);
const literal = n => n && (ts.isStringLiteralLike(n) || ts.isJsxText(n)) ? n.text : undefined;
const scope = n => { for (let p = n.parent; p; p = p.parent)
    if (ts.isFunctionLike(p) || ts.isSourceFile(p))
        return p; };
const ptStrings = new Set();
function collectPt(pt, en) { for (const [k, v] of Object.entries(pt)) {
    if (typeof v === 'object' && v)
        collectPt(v, en?.[k] || {});
    else if (typeof v === 'string' && v !== en?.[k])
        ptStrings.add(v);
} }
for (const ns of Object.keys(catalogs['pt-BR']))
    collectPt(catalogs['pt-BR'][ns], catalogs.en[ns] || {});
const words = obj => JSON.stringify(obj).toLowerCase().match(/[a-zà-ž]{4,}/g) || [];
const enWords = new Set(words(catalogs.en));
const ptCounts = new Map();
for (const word of words(catalogs['pt-BR']))
    if (!enWords.has(word))
        ptCounts.set(word, (ptCounts.get(word) || 0) + 1);
const ptWords = new Set([...ptCounts].filter(([, count]) => count >= 3).map(([word]) => word));
const portuguese = s => ptStrings.has(s) || words(s).some(word => ptWords.has(word)) || /[ãõçáéíóúâêô]|\b(?:Carregando|Selecione|Nenhum|Nenhuma|Adicionar|Excluir|Salvar|Cancelar|Digite|Conversa|Conexão|Falha|Erro|Aguarde|Copiar|Nome|Valor|Voltar|Permite|Escolha|Remover|Obrigatório|obrigatório|sucesso|mensagem|enviar|contato|seguintes|configurar|configuração)\b/i.test(s);
// Recognize string fallbacks rendered inside JSX without treating classes,
// protocol values, comparisons, or function arguments as display text.
function isRenderedLiteral(node, sourceFile) {
    for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isJsxAttribute(parent)) return /^(title|placeholder|aria-label|alt|description|label)$/.test(parent.name.getText(sourceFile));
        if (ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent) || ts.isCallExpression(parent) || ts.isPropertyAssignment(parent) || ts.isFunctionLike(parent)) return false;
        if (ts.isBinaryExpression(parent) && ![ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)) return false;
        if (ts.isJsxExpression(parent)) {
            const container = parent.parent;
            if (ts.isJsxElement(container)) return !['style', 'script'].includes(container.openingElement.tagName.getText(sourceFile));
            return ts.isJsxFragment(container) || (ts.isJsxAttribute(container) && /^(title|placeholder|aria-label|alt|description|label)$/.test(container.name.getText(sourceFile)));
        }
    }
    return false;
}
const report = { files: files.length, calls: [], dynamic: [], missing: [], hardcoded: [], syntaxErrors: [] };
const check = process.argv.includes('--check');
for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    for (const diagnostic of sf.parseDiagnostics)
        report.syntaxErrors.push({ file: path.relative(root, file), message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ') });
    const bindings = [];
    const callNodes = new Set();
    const visitBindings = n => {
        if (ts.isVariableDeclaration(n) && ts.isObjectBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && /^(useLanguage|useTranslation|useI18nTranslation|useUiTranslation)$/.test(n.initializer.expression.getText(sf))) {
            const ns = literal(n.initializer.arguments[0]);
            for (const el of n.name.elements)
                if ((el.propertyName?.getText(sf) || el.name.getText(sf)) === 't')
                    bindings.push({ name: el.name.getText(sf), ns, scope: scope(n) });
        }
        ts.forEachChild(n, visitBindings);
    };
    visitBindings(sf);
    const translateName = name => /^(t|tx|t[A-Z]\w*|i18n\.t)$/.test(name);
    const visit = n => {
        const loc = { file: path.relative(root, file), line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, start: n.getStart(sf), end: n.end };
        if (ts.isCallExpression(n) && translateName(n.expression.getText(sf))) {
            const name = n.expression.getText(sf);
            const candidates = bindings.filter(b => b.name === name && b.scope.pos <= n.pos && b.scope.end >= n.end).sort((a, b) => (a.scope.end - a.scope.pos) - (b.scope.end - b.scope.pos));
            let ns = candidates[0]?.ns;
            const sameName = bindings.filter(b => b.name === name && b.ns);
            if (!ns && new Set(sameName.map(b => b.ns)).size === 1)
                ns = sameName[0]?.ns;
            // A translator passed through props keeps its caller's namespace.
            const relative = path.relative(root, file);
            const contexts = {
                'src/components/ai_agents/Tabs/AgentTabs.tsx': 'aiAgents',
                'src/components/channels/settings/TemplatePreview.tsx': 'channels',
                'src/components/channels/settings/helpers/agentBotHelpers.ts': 'channels',
                'src/components/customAttributes/CustomAttributesForm.tsx': 'customAttributes',
                'src/components/customMcpServers/wizardConfig.ts': 'customMcpServers',
                'src/components/layout/config/menuItems.ts': 'layout',
                'src/components/scheduledActions/scheduledActionChannelUtils.ts': 'chat',
                'src/components/widget/ChatScreen.tsx': 'widget',
                'src/config/permissions.ts': 'roles',
                'src/constants/mcpIntegrations.ts': 'aiAgents',
                'src/hooks/useWidgetConfig.ts': 'widget',
                'src/hooks/widget/useWidgetRealtime.ts': 'widget',
                'src/services/crmForms/crmFormTargets.ts': 'crmForms',
                'src/utils/agents/agentTypeLabel.ts': 'aiAgents',
                'src/utils/chat/conversationStatus.ts': 'chat',
                'src/utils/widget/messages.ts': 'widget',
            };
            if (!ns)
                ns = contexts[relative];
            if (!ns && relative.startsWith('src/pages/Customer/Dashboard/'))
                ns = 'customerDashboard';
            const key = literal(n.arguments[0]);
            let fallback = literal(n.arguments[1]);
            if (fallback === undefined && ts.isBinaryExpression(n.parent) && n.parent.left === n && n.parent.operatorToken.kind === ts.SyntaxKind.BarBarToken)
                fallback = literal(n.parent.right);
            if (n.arguments[1] && ts.isObjectLiteralExpression(n.arguments[1]))
                for (const prop of n.arguments[1].properties)
                    if (ts.isPropertyAssignment(prop)) {
                        if (prop.name.getText(sf) === 'defaultValue')
                            fallback = literal(prop.initializer);
                        if (prop.name.getText(sf) === 'ns')
                            ns = literal(prop.initializer) || ns;
                    }
            callNodes.add(n);
            if (key !== undefined) {
                let realKey = key;
                if (key.includes(':'))
                    [ns, realKey] = [key.split(':')[0], key.slice(key.indexOf(':') + 1)];
                const en = ns ? at(catalogs.en[ns], realKey) : undefined;
                const pt = ns ? at(catalogs['pt-BR'][ns], realKey) : undefined;
                const row = { ...loc, callee: name, ns, key: realKey, keyStart: n.arguments[0].getStart(sf), keyEnd: n.arguments[0].end, fallback, en, pt };
                report.calls.push(row);
                if (en === undefined && !['_one', '_other', '_zero'].some(suffix => ns && at(catalogs.en[ns], realKey + suffix) !== undefined))
                    report.missing.push(row);
            }
            else
                report.dynamic.push({ ...loc, ns, expression: n.arguments[0]?.getText(sf) });
        }
        if (ts.isTemplateExpression(n)) {
            const fixed = (n.head.text + n.templateSpans.map(span => span.literal.text).join(' ')).replace(/\s+/g, ' ').trim();
            let parent = n.parent;
            let ignored = false;
            for (let p = parent; p && !ts.isStatement(p); p = p.parent)
                if (callNodes.has(p) || (ts.isCallExpression(p) && /^console\./.test(p.expression.getText(sf))))
                    ignored = true;
            const attr = ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent) ? parent.parent.name.getText(sf) : '';
            const feedback = ts.isCallExpression(parent) && /^(toast\.(success|error|info|warning)|(?:window\.)?(alert|confirm|prompt))$/.test(parent.expression.getText(sf));
            const visible = /^(title|placeholder|alt|aria-label|label|description)$/.test(attr) || feedback;
            if (!ignored && /[A-Za-zÀ-ž]/.test(fixed) && (visible || (portuguese(fixed) && /\s/.test(fixed))))
                report.hardcoded.push({ ...loc, kind: 'template', text: n.getText(sf), pt: portuguese(fixed) });
        }
        let text = literal(n);
        if (text !== undefined)
            text = text.replace(/\s+/g, ' ').trim();
        if (text && /[A-Za-zÀ-ž]/.test(text)) {
            let trans = false, consoleCall = false;
            for (let p = n.parent; p && !ts.isStatement(p); p = p.parent) {
                if (callNodes.has(p))
                    trans = true;
                if (ts.isCallExpression(p) && /^console\./.test(p.expression.getText(sf)))
                    consoleCall = true;
            }
            if (!trans && !consoleCall) {
                const parent = n.parent;
                let kind;
                if (ts.isJsxText(n))
                    kind = 'jsx';
                else if (ts.isJsxAttribute(parent) && /^(title|placeholder|alt|aria-label|label|description|emptyText|helperText)$/.test(parent.name.getText(sf)))
                    kind = 'attribute';
                else if (ts.isPropertyAssignment(parent) && /^(label|title|description|placeholder|message|tooltip|helpText|emptyText)$/.test(parent.name.getText(sf)))
                    kind = 'display-property';
                else if (ts.isCallExpression(parent) && /^(toast\.(success|error|info|warning)|(?:window\.)?(?:alert|confirm|prompt))$/.test(parent.expression.getText(sf)))
                    kind = 'feedback';
                else if (ts.isNewExpression(parent) && parent.expression.getText(sf) === 'Error')
                    kind = 'error';
                else if (isRenderedLiteral(n, sf))
                    kind = 'jsx-expression';
                else if (portuguese(text))
                    kind = 'portuguese';
                if (kind)
                    report.hardcoded.push({ ...loc, kind, text, pt: portuguese(text) });
            }
        }
        ts.forEachChild(n, visit);
    };
    visit(sf);
}
const out = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--'));
if (out)
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
const summary = { files: report.files, calls: report.calls.length, dynamic: report.dynamic.length, missing: report.missing.length, hardcoded: report.hardcoded.length, hardcodedPortuguese: report.hardcoded.filter(x => x.pt).length };
if (check) {
    const { auditDynamicKeys } = await import('./i18n-dynamic-audit.mjs');
    const dynamic = auditDynamicKeys(report, catalogs, root);
    summary.resolvedDynamicKeys = dynamic.resolved.length;
    const exceptions = JSON.parse(fs.readFileSync(path.join(root, 'scripts/i18n-source-exceptions.json'), 'utf8'));
    const reviewed = new Set(exceptions.flatMap(group => Object.entries(group.files).flatMap(([file, strings]) => strings.map(text => file + '\0' + text))));
    const hardcoded = report.hardcoded.filter(row => !reviewed.has(row.file + '\0' + row.text));
    const missingPortuguese = report.calls.filter(row => row.en !== undefined && row.pt === undefined);
    const failures = [...report.syntaxErrors, ...report.missing, ...missingPortuguese, ...dynamic.missing, ...dynamic.registryMissing, ...hardcoded];
    summary.unreviewedHardcoded = hardcoded.length;
    console.log(JSON.stringify(summary, null, 2));
    if (failures.length) {
        console.error('i18n audit failed:');
        for (const row of failures)
            console.error(`${row.file}:${row.line || 1} ${row.ns ? row.ns + ':' : ''}${row.key || row.text || row.message}`);
        process.exitCode = 1;
    }
}
else
    console.log(JSON.stringify(summary, null, 2));
