/* extraction.js — business data extractie via JSONPath, XPath of Regex */
window.ExtractionEngine = {
    extract(payload, rule) {
        if (!payload || !rule?.expression) return '';
        try {
            switch (rule.type) {
                case 0: // JsonPath
                    return this.jsonPath(payload, rule.expression);
                case 1: // XPath
                    return this.xPath(payload, rule.expression);
                case 2: // Regex
                    return this.regex(payload, rule.expression);
                default:
                    return '';
            }
        } catch {
            return '';
        }
    },

    jsonPath(payload, expr) {
        let obj;
        try { obj = JSON.parse(payload); } catch { return ''; }
        // Eenvoudige JSONPath: ondersteunt $.a.b.c en $['a']['b']
        const path = expr.replace(/^\$/, '').split(/[.[\]'"]+/).filter(Boolean);
        let cur = obj;
        for (const key of path) {
            if (cur === null || cur === undefined) return '';
            cur = cur[key];
        }
        return cur === undefined ? '' : (typeof cur === 'object' ? JSON.stringify(cur) : String(cur));
    },

    xPath(payload, expr) {
        const trimmed = payload.trimStart();
        if (!trimmed.startsWith('<')) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(payload, 'text/xml');
        if (doc.querySelector('parsererror')) return '';
        const result = doc.evaluate(expr, doc, null, XPathResult.STRING_TYPE, null);
        return result.stringValue ?? '';
    },

    regex(payload, expr) {
        const re = new RegExp(expr);
        const match = payload.match(re);
        return match ? (match[1] ?? match[0]) : '';
    }
};
