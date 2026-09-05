/**
 * Suporte a conteúdo do tipo "código/HTML" (Editor e itens personalizados do
 * Dashboard) que na verdade é um componente React em JSX, não HTML puro.
 *
 * O visualizador normalmente entrega o texto direto para um <iframe srcDoc>,
 * que só entende HTML/CSS/JS estático — não resolve `import` nem transpila
 * JSX. Quando detectamos que o conteúdo é código React, embrulhamos com
 * React + ReactDOM + Babel standalone via CDN para transpilar e montar o
 * componente no próprio navegador, sem precisar de um bundler.
 *
 * Limitação conhecida: imports de pacotes que não sejam 'react'/'react-dom'
 * (ex.: ícones de 'lucide-react') não existem via CDN sem bundler — cada
 * nome importado vira um componente placeholder (badge com a inicial) em vez
 * do ícone real.
 */

/** Heurística: o texto parece ser um componente React/JSX em vez de HTML puro? */
export function looksLikeReactSource(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return false;
  const hasReactImport = /import\s+[^;]*\bfrom\s+['"]react['"]/.test(code);
  const hasHooks = /\buse(State|Effect|Ref|Memo|Callback|Context|Reducer)\s*\(/.test(code);
  const hasExportDefaultComponent =
    /export\s+default\s+function\s+[A-Za-z_$]/.test(code) ||
    /export\s+default\s+[A-Za-z_$][\w$]*\s*;?\s*$/m.test(trimmed);
  return hasReactImport || (hasHooks && hasExportDefaultComponent);
}

interface ParsedImport {
  raw: string;
  defaultName?: string;
  namedNames: string[];
  pkg: string;
}

const IMPORT_REGEX = /import\s+(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s+['"]([^'"]+)['"]\s*;?/g;

function parseImports(code: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  let match: RegExpExecArray | null;
  IMPORT_REGEX.lastIndex = 0;
  while ((match = IMPORT_REGEX.exec(code))) {
    const [raw, defaultName, namedList, pkg] = match;
    const namedNames = (namedList ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((n) => {
        const asMatch = n.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
        return asMatch ? asMatch[2] : n;
      });
    imports.push({ raw, defaultName, namedNames, pkg });
  }
  return imports;
}

/** Componente placeholder: badge com a(s) primeira(s) letra(s) do nome importado. */
function stubDeclaration(name: string): string {
  const label = name.slice(0, 2);
  return `const ${name} = (props) => React.createElement('span', Object.assign({}, props, { title: ${JSON.stringify(
    name,
  )}, style: Object.assign({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.4em', height: '1.4em', padding: '0 3px', fontSize: '0.65em', fontWeight: 600, borderRadius: '4px', background: '#e5e7eb', color: '#374151', verticalAlign: 'middle' }, (props && props.style) || {}) }), ${JSON.stringify(
    label,
  )});`;
}

/**
 * Transforma código de componente React (com imports ES module e JSX) em um
 * documento HTML autônomo que roda no navegador via CDN (React + Babel
 * standalone), pronto para ser usado como `srcDoc` de um iframe.
 */
export function wrapReactComponent(rawCode: string): string {
  const imports = parseImports(rawCode);
  let code = rawCode;
  for (const imp of imports) code = code.replace(imp.raw, '');

  const stubNames = new Set<string>();
  for (const imp of imports) {
    if (imp.pkg === 'react' || imp.pkg === 'react-dom') continue;
    if (imp.defaultName) stubNames.add(imp.defaultName);
    imp.namedNames.forEach((n) => stubNames.add(n));
  }

  let componentName = 'App';
  const fnMatch = code.match(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/);
  const refMatch = code.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/m);
  if (fnMatch) componentName = fnMatch[1];
  else if (refMatch) componentName = refMatch[1];
  code = code.replace(/export\s+default\s+/g, '');

  const stubsBlock = [...stubNames].map(stubDeclaration).join('\n');

  const babelSource = `
const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } = React;
${stubsBlock}
${code}
try {
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${componentName}));
} catch (err) {
  document.getElementById('root').innerHTML =
    '<pre style="padding:16px;color:#b91c1c;white-space:pre-wrap">Erro ao renderizar componente: ' +
    (err && err.message ? err.message : String(err)) + '</pre>';
}`;

  // Embrulha em string em vez de <script type="text/babel"> porque o modo
  // "automático" do preset react (padrão do Babel standalone) injeta um
  // `import` de 'react/jsx-runtime' no código gerado — e isso quebra a
  // execução, já que não estamos dentro de um módulo ES. Transformar
  // explicitamente com `runtime: 'classic'` gera só React.createElement(...).
  const embeddedSource = JSON.stringify(babelSource).replace(/<\//g, '<\\/');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>
</head>
<body>
<div id="root">
  <p style="padding:16px;color:#6b7280;font-size:13px">Carregando componente…</p>
</div>
<script>
(function () {
  var source = ${embeddedSource};
  try {
    var out = Babel.transform(source, { presets: [['react', { runtime: 'classic' }]] });
    var s = document.createElement('script');
    s.text = out.code;
    document.body.appendChild(s);
  } catch (err) {
    document.getElementById('root').innerHTML =
      '<pre style="padding:16px;color:#b91c1c;white-space:pre-wrap">Erro ao compilar componente: ' +
      (err && err.message ? err.message : String(err)) + '</pre>';
  }
})();
</script>
</body>
</html>`;
}

/**
 * Ponto único usado pelos visualizadores de conteúdo: recebe o texto salvo
 * como HTML e devolve o que deve ir para o `srcDoc` do iframe — embrulhado
 * se for código React, ou o próprio texto se já for HTML puro.
 */
export function resolveRenderableSrcDoc(code: string): string {
  return looksLikeReactSource(code) ? wrapReactComponent(code) : code;
}
