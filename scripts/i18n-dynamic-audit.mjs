import process from 'node:process';
import path from 'node:path';
import ts from 'typescript';
export function auditDynamicKeys(report, catalogs, root = process.cwd()) {
    const config = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const checker = program.getTypeChecker();
    const look = new Map(report.dynamic.map(r => [r.file + ':' + r.start, r]));
    const enCatalogs = catalogs.en;
    const at = (o, k) => k.split('.').reduce((a, b) => a?.[b], o);
    function values(n) {
        if (ts.isStringLiteralLike(n))
            return [n.text];
        if (ts.isConditionalExpression(n)) {
            const a = values(n.whenTrue), b = values(n.whenFalse);
            return a && b ? [...a, ...b] : undefined;
        }
        if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n))
            return values(n.expression);
        if (ts.isTemplateExpression(n)) {
            let a = [n.head.text];
            for (const s of n.templateSpans) {
                const v = values(s.expression);
                if (!v || a.length * v.length > 250)
                    return;
                a = a.flatMap(x => v.map(y => x + y + s.literal.text));
            }
            return a;
        }
        const type = checker.getTypeAtLocation(n);
        const parts = type.isUnion() ? type.types : [type];
        if (parts.every(t => t.isStringLiteral() || (t.flags & ts.TypeFlags.NumberLiteral)))
            return parts.map(t => String(t.value));
    }
    const missing = [], resolved = [], registryMissing = [];
    for (const sf of program.getSourceFiles()) {
        const file = path.relative(root, sf.fileName);
        if (!file.startsWith('src/') || /(spec|test|stories)/.test(file))
            continue;
        function visit(n) {
            const row = look.get(file + ':' + n.getStart(sf));
            if (row && ts.isCallExpression(n)) {
                const keys = values(n.arguments[0]);
                if (keys) {
                    for (let key of new Set(keys)) {
                        let ns = row.ns;
                        if (key.includes(':')) {
                            ns = key.split(':')[0];
                            key = key.slice(key.indexOf(':') + 1);
                        }
                        const valid = ['en', 'pt-BR'].every(lang => typeof at(catalogs[lang][ns], key) === 'string' || ['_one', '_other'].some(x => typeof at(catalogs[lang][ns], key + x) === 'string'));
                        (valid ? resolved : missing).push({ ...row, key, ns });
                    }
                }
            }
            if (ts.isPropertyAssignment(n) && /^(labelKey|subtitleKey|descriptionKey|i18nKey|messageKey|attributeI18nKey)$/.test(n.name.getText(sf)) && ts.isStringLiteralLike(n.initializer)) {
                const k = n.initializer.text;
                if (!k)
                    return;
                let valid = false;
                if (k.includes(':'))
                    valid = at(enCatalogs[k.split(':')[0]], k.split(':')[1]) !== undefined;
                else
                    valid = Object.values(enCatalogs).some(c => at(c, k) !== undefined);
                if (!valid)
                    registryMissing.push({ file, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, key: k });
            }
            ts.forEachChild(n, visit);
        }
        visit(sf);
    }
    return { resolved, missing, registryMissing };
}
