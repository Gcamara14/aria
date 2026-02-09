(function() {
    /**
     * AccName Bookmarklet v5
     * Accessible Name Computation + Validation
     */

    // --- Helpers ---
    function isVisible(el) {
        if (!el || el.nodeType !== 1) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    }
    
    function isFocusable(el) {
        if (el.disabled) return false;
        if (el.hasAttribute('tabindex')) {
            const ti = parseInt(el.getAttribute('tabindex'), 10);
            return !isNaN(ti);
        }
        const tag = el.tagName.toLowerCase();
        if (tag === 'a' && el.hasAttribute('href')) return true;
        if (['button', 'input', 'select', 'textarea', 'summary'].includes(tag)) return true;
        if (el.isContentEditable) return true;
        return false;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- Computation Logic ---
    function computeName(el, visited = [], isReferenced = false, ignoreLabelledby = false) {
        if (!el) return '';
        if (el.nodeType === 3) return el.textContent;
        if (el.nodeType !== 1) return '';
        
        // Handle circular references
        if (visited.includes(el) && !ignoreLabelledby) return '';

        if (!isReferenced && !isVisible(el)) return '';

        // 1. aria-labelledby
        if (!ignoreLabelledby && el.hasAttribute('aria-labelledby')) {
             const ids = el.getAttribute('aria-labelledby').split(/\s+/);
             const newVisited = visited.concat(el);
             let parts = [];
             for (const id of ids) {
                 const ref = document.getElementById(id);
                 if (ref) {
                     // If referencing self, compute name ignoring aria-labelledby to avoid loop
                     const isSelf = ref === el;
                     parts.push(computeName(ref, newVisited, true, isSelf));
                 }
             }
             const labelledby = parts.join(' ').trim();
             if (labelledby) return labelledby;
        }
        
        // 2. aria-label
        if (el.hasAttribute('aria-label')) {
            const label = el.getAttribute('aria-label').trim();
            if (label) return label;
        }
        
        // 3. Native
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'img') return el.alt || el.title || '';
        if (tagName === 'input') {
            if (el.type === 'image') return el.alt || el.title || 'Submit Query';
            if (el.type === 'submit' || el.type === 'button') return el.value || el.title || 'Submit';
             if (el.labels && el.labels.length > 0) {
                 let parts = [];
                 for (let i = 0; i < el.labels.length; i++) {
                     parts.push(computeName(el.labels[i], visited.concat(el), isReferenced));
                 }
                 return parts.join(' ').trim();
             }
             return el.placeholder || el.title || '';
        }
        
        // 4. Content
        let parts = [];
        const newVisited = visited.concat(el);
        el.childNodes.forEach(child => {
            if (child.nodeType === 3) parts.push(child.textContent);
            else if (child.nodeType === 1) {
                if (child.getAttribute('aria-hidden') === 'true') return;
                parts.push(computeName(child, newVisited, isReferenced));
            }
        });
        const content = parts.join(' ').replace(/\s+/g, ' ').trim();
        if (content) return content;
        if (el.title) return el.title.trim();
        return '';
    }

    // --- Validation Rules ---
    const Rules = [
        {
            id: 'ACC-NAME-001',
            title: 'Accessible name is not empty',
            severity: 'Critical',
            check: (name, el) => {
                // Only check interactive elements or images for empty names
                // We don't want to flag empty <h2> or <p> unless they are focusable
                const isImg = el.tagName.toLowerCase() === 'img' || el.getAttribute('role') === 'img';
                if (!isFocusable(el) && !isImg) return null;

                if (!name || name.trim().length === 0) return "Name is empty or whitespace only";
                return null;
            }
        },
        {
            id: 'ACC-NAME-002',
            title: 'Accessible name must not contain "undefined"',
            severity: 'Critical',
            check: (name, el) => {
                if (!isFocusable(el)) return null;
                if (name.toLowerCase().includes('undefined')) return 'Name contains "undefined"';
                return null;
            }
        },
        {
            id: 'ACC-NAME-003',
            title: 'Accessible name must be descriptive',
            severity: 'Moderate',
            check: (name, el) => {
                if (!isFocusable(el)) return null;
                const vague = ['click here', 'item', 'option', 'button', 'link'];
                if (vague.includes(name.toLowerCase())) return `Name "${name}" is too vague`;
                return null;
            }
        },
        {
            id: 'ACC-NAME-004',
            title: 'Avoid generic phrases',
            severity: 'Moderate',
            check: (name, el) => {
                if (!isFocusable(el)) return null;
                const generic = ['learn more', 'see more', 'see less', 'more', 'details', 'read more'];
                if (generic.includes(name.toLowerCase())) return `Name "${name}" is generic without context`;
                return null;
            }
        },
        {
            id: 'ACC-NAME-005',
            title: 'Name must be unique among peers',
            severity: 'Moderate',
            guidance: 'WCAG 2.4.4/2.4.9: If elements look the same and function the same (e.g. same destination), they SHOULD have the same name. If they function differently, they MUST have unique names. Note: Context matters. For example, multiple links within the same product tile pointing to the same product page are valid duplicates. However, links with the same name (e.g., "View Details") in different product tiles pointing to different products are invalid duplicates.',
            check: (name, el, context) => null // Handled in pass 2
        },
        {
            id: 'ACC-NAME-006',
            title: 'Name must not contain role type',
            severity: 'Moderate',
            check: (name, el) => {
                if (!isFocusable(el)) return null;
                // LEGACY: This rule is disabled because product names often contain role words 
                // (e.g. "Sharper Image", "Button Floral Dress"), causing false positives.
                return null;
            }
        },
        {
            id: 'ACC-NAME-007',
            title: 'Name must not contain internal duplication',
            severity: 'Moderate',
            check: (name, el) => {
                if (!isFocusable(el)) return null;
                const match = name.match(/^(.+?)(?:\s*[\.\-]\s*|\s+)\1$/i);
                if (match) return `Name repeats itself: "${match[1]}"`;
                return null;
            }
        },
        {
            id: 'ACC-NAME-008',
            title: 'Name should be concise',
            severity: 'Warning',
            check: (name, el) => {
                // Only check interactive elements or images
                const isImg = el.tagName.toLowerCase() === 'img' || el.getAttribute('role') === 'img';
                if (!isFocusable(el) && !isImg) return null;

                if (name.length > 350) return `Name is too long (${name.length} chars)`;
                return null;
            }
        },
        {
            id: 'ACC-NAME-009',
            title: 'Interactive element must not be aria-hidden',
            severity: 'Critical',
            check: (name, el) => {
                if (el.getAttribute('aria-hidden') === 'true') {
                    return 'Focusable element is aria-hidden="true" but not removed from tab order';
                }
                return null;
            }
        },
        {
            id: 'ACC-NAME-010',
            title: 'Prohibited uses of aria-label/labelledby',
            severity: 'Critical',
            check: (name, el) => {
                // 1. Check if naming attributes are present
                const hasLabel = el.hasAttribute('aria-label');
                const hasLabelledBy = el.hasAttribute('aria-labelledby');
                
                // If no naming attributes, rule doesn't apply
                if (!hasLabel && !hasLabelledBy) return null;

                // 2. Determine Role
                const tag = el.tagName.toLowerCase();
                const role = el.getAttribute('role');

                // Helper for suggestion
                const getSuggestion = () => {
                    const interactive = el.querySelector('input, button, a[href], select, textarea');
                    if (interactive) return ` (Fix: Move aria-label to <${interactive.tagName.toLowerCase()}>)`;
                    if (tag === 'label') return ' (Fix: Remove aria-label, use visible text)';
                    return ' (Fix: Remove attribute or add valid role)';
                };

                // List of roles that PROHIBIT naming (ARIA 1.2)
                const prohibitedRoles = [
                    'caption', 'code', 'deletion', 'emphasis', 'generic', 
                    'insertion', 'paragraph', 'presentation', 'none', 
                    'strong', 'subscript', 'superscript'
                ];

                // Check Explicit Role
                if (role && prohibitedRoles.includes(role)) {
                    return `Role "${role}" prohibits naming attributes.${getSuggestion()}`;
                }

                // Check Implicit Role (Generic elements)
                // div and span are 'generic' unless they have a role
                if (!role && (tag === 'div' || tag === 'span')) {
                    return `Generic <${tag}> elements ignore aria-label/labelledby.${getSuggestion()}`;
                }

                // Check Implicit Role (Presentational or Prohibited)
                if (!role && ['br', 'b', 'i', 'p', 'strong', 'em', 'code', 's', 'u', 'label'].includes(tag)) {
                     return `<${tag}> prohibits naming attributes.${getSuggestion()}`;
                }

                return null;
            }
        }
    ];

    // --- Execution ---

    // Select ALL elements that might have an accessible name or role
    // This includes interactive elements, but also generic containers that might be mislabeled
    const elements = document.querySelectorAll('[aria-label], [aria-labelledby], [role], button, a[href], input:not([type="hidden"]), select, textarea, details, summary');
    
    // Pass 1: Collect Data & Filter
    const items = [];
    const nameData = {}; // Stores usage details: { 'name': [{ href, el }, ...] }
    
    elements.forEach(el => {
        // 0. Base visibility check
        if (!isVisible(el)) return;
        
        // 1. Aria-Hidden Logic (Smarter Check: Is element OR ancestor hidden?)
        if (el.closest('[aria-hidden="true"]')) return;

        // 2. Filter out non-interactive elements that don't have naming attributes
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const hasNamingAttr = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
        const isImg = tag === 'img' || role === 'img';
        const interactiveRoles = [
            'button', 'link', 'checkbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 
            'option', 'radio', 'switch', 'tab', 'textbox', 'combobox', 'gridcell', 
            'slider', 'spinbutton', 'treeitem', 'searchbox',
            'application', 'dialog', 'alertdialog', 'grid', 'listbox', 'menu', 'menubar', 
            'radiogroup', 'tablist', 'tree', 'treegrid', 'toolbar'
        ];
        
        if (!isFocusable(el) && !hasNamingAttr && !isImg && !interactiveRoles.includes(role)) {
             return;
        }

        const name = computeName(el);
        const lowerName = name.toLowerCase().trim();
        let href = (tag === 'a' && el.hasAttribute('href')) ? el.href : null;
        
        if (lowerName) {
            if (!nameData[lowerName]) nameData[lowerName] = [];
            nameData[lowerName].push({ href: href, element: el });
        }
        
        let id = el.id ? '#' + el.id : '';
        let cls = el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).join('.') : '';
        let fullSelector = tag + id + cls;

        items.push({
            element: el,
            selector: fullSelector,
            tag: tag,
            name: name,
            issues: []
        });
    });

    // Pass 2: Validation
    let stats = { Critical: 0, Moderate: 0, Warning: 0, Total: 0 };
    
    items.forEach(item => {
        const issues = [];
        
        Rules.forEach(rule => {
            if (rule.id === 'ACC-NAME-005') {
                if (!isFocusable(item.element)) return;

                const lower = item.name.toLowerCase().trim();
                const usages = nameData[lower];
                
                if (usages && usages.length > 1) {
                    // Smart Check: Are they all links to the same place?
                    const allLinks = usages.every(u => u.href);
                    if (allLinks) {
                        const firstHref = usages[0].href;
                        const allSame = usages.every(u => u.href === firstHref);
                        if (allSame) {
                            // Valid duplicate (Same Name, Same Destination)
                            return; 
                        }
                    }
                    
                    // Otherwise, flag it
                    let msg = `Name is used ${usages.length} times.`;
                    if (allLinks) {
                        msg += ` (Links go to different destinations)`;
                    } else {
                        msg += ` (Verify they perform the same function)`;
                    }
                    
                    issues.push({
                        id: rule.id,
                        msg: msg,
                        severity: rule.severity,
                        guidance: rule.guidance,
                        requiresReview: true
                    });
                }
            } else {
                const error = rule.check(item.name, item.element, items);
                if (error) {
                    issues.push({
                        id: rule.id,
                        msg: error,
                        severity: rule.severity
                    });
                }
            }
        });
        
        item.issues = issues;
        if (issues.length > 0) {
            stats.Total++;
            issues.forEach(i => stats[i.severity]++);
        }
    });

    // --- Output ---
    
    const win = window.open('', 'AccNameAudit', 'width=1000,height=800,scrollbars=yes,resizable=yes');
    if (!win) { alert('Popups blocked'); return; }
    
    const doc = win.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Accessible Name Audit</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #f4f5f7; color: #172b4d; }
                header { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin-bottom: 20px; }
                h1 { margin: 0 0 15px 0; font-size: 24px; }
                .summary { display: flex; gap: 20px; }
                .card { flex: 1; padding: 15px; border-radius: 6px; background: #f4f5f7; text-align: center; }
                .card.critical { background: #ffebeb; color: #bf2600; }
                .card.moderate { background: #fff0b3; color: #172b4d; }
                .card.warning { background: #e3fcef; color: #006644; }
                .tag-critical { background: #ff5630; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; }
                .tag-moderate { background: #ffab00; color: #172b4d; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; }
                .tag-warning { background: #00b8d9; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; }
                .tag-review { background: #eAe6ff; color: #403294; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; margin-right: 6px; }
                table { width: 100%; background: #fff; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                th { background: #fafbfc; text-align: left; padding: 12px; border-bottom: 2px solid #dfe1e6; position: sticky; top: 0; font-size: 12px; text-transform: uppercase; color: #5e6c84; }
                td { padding: 12px; border-bottom: 1px solid #dfe1e6; font-size: 14px; vertical-align: top; }
                tr.group-stripe { background: #f8f9fa; }
                tr:hover { background: #e9ecef !important; }
                .issues-list { list-style: none; padding: 0; margin: 0; }
                .issue-item { margin-bottom: 4px; font-size: 12px; display: flex; flex-direction: column; gap: 2px; }
                .issue-header { display: flex; gap: 6px; align-items: center; }
                .guidance { font-size: 11px; color: #666; font-style: italic; margin-left: 48px; margin-bottom: 4px; }
                .controls { margin-top: 15px; }
                button { background: #0052cc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500; }
                button:hover { background: #0065ff; }
            </style>
        </head>
        <body>
            <header>
                <h1>Accessible Name Validation Report</h1>
                <div class="summary">
                    <div class="card critical">
                        <div style="font-size: 24px; font-weight: bold;">${stats.Critical}</div>
                        <div>Critical Issues</div>
                    </div>
                    <div class="card moderate" style="background: #fff7d6; color: #172b4d">
                        <div style="font-size: 24px; font-weight: bold;">${stats.Moderate}</div>
                        <div>Moderate Issues</div>
                    </div>
                    <div class="card warning" style="background: #e6fcff; color: #006644">
                        <div style="font-size: 24px; font-weight: bold;">${stats.Warning}</div>
                        <div>Warnings</div>
                    </div>
                    <div class="card">
                        <div style="font-size: 24px; font-weight: bold;">${items.length}</div>
                        <div>Elements Scanned</div>
                    </div>
                </div>
                <div class="controls">
                    <button id="exportBtn">Export CSV Report</button>
                </div>
            </header>
            <div id="table-container"></div>
        </body>
        </html>
    `);
    doc.close();
    
    const table = doc.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 30%">Element</th>
                <th style="width: 25%">Accessible Name</th>
                <th style="width: 45%">Validation Issues</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    
    // Sort: Severity Score -> Name
    items.sort((a, b) => {
        const getScore = (item) => {
            let score = 0;
            item.issues.forEach(i => {
                if (i.severity === 'Critical') score += 100;
                if (i.severity === 'Moderate') score += 10;
                if (i.severity === 'Warning') score += 1;
            });
            return score;
        };
        const scoreDiff = getScore(b) - getScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    // Zebra striping by group (name)
    let isStriped = false;
    let lastKey = null;

    items.forEach(item => {
        const tr = doc.createElement('tr');
        
        // Grouping logic
        const currentKey = (item.name || '').toLowerCase();
        if (currentKey !== lastKey) {
            isStriped = !isStriped;
            lastKey = currentKey;
        }
        
        if (isStriped) {
            tr.classList.add('group-stripe');
        }
        
        let issuesHtml = '';
        if (item.issues.length > 0) {
            issuesHtml = `<ul class="issues-list">
                ${item.issues.map(i => `
                    <li class="issue-item">
                        <div class="issue-header">
                            <span class="tag-${i.severity.toLowerCase()}">${i.severity}</span>
                            ${i.requiresReview ? '<span class="tag-review">Needs Human/AI Review</span>' : ''}
                            <span><b>[${i.id}]</b> ${escapeHtml(i.msg)}</span>
                        </div>
                        ${i.guidance ? `<div class="guidance">${escapeHtml(i.guidance)}</div>` : ''}
                    </li>
                `).join('')}
            </ul>`;
        } else {
            issuesHtml = '<span style="color:#36b37e; font-weight:500">✓ Pass</span>';
        }

        const selDisplay = item.selector.length > 50 ? item.selector.substring(0, 50) + '...' : item.selector;

        tr.innerHTML = `
            <td>
                <div style="font-family:monospace; color: #0052cc; font-size: 12px; margin-bottom: 4px;">${selDisplay}</div>
                <div style="font-size: 12px; color: #6b778c;">${item.tag}</div>
            </td>
            <td style="font-weight: 500;">
                ${item.name || '<span style="color:#de350b; font-style:italic">empty</span>'}
            </td>
            <td>${issuesHtml}</td>
        `;

        tr.style.cursor = 'pointer';
        tr.onmouseenter = () => {
            if (item.element.isConnected) {
                item.element.dataset.accOldOutline = item.element.style.outline;
                item.element.style.outline = '4px solid #ff5630';
                item.element.scrollIntoView({behavior: 'smooth', block: 'nearest'});
            }
        };
        tr.onmouseleave = () => {
            if (item.element.isConnected) {
                item.element.style.outline = item.element.dataset.accOldOutline || '';
            }
        };
        tr.onclick = (e) => {
            e.preventDefault();
            window.focus();
            item.element.scrollIntoView({behavior: 'auto', block: 'center'});
            item.element.focus();
            const oldBg = item.element.style.backgroundColor;
            item.element.style.transition = 'background-color 0.2s';
            item.element.style.backgroundColor = 'rgba(255, 86, 48, 0.3)';
            setTimeout(() => {
                item.element.style.backgroundColor = oldBg;
            }, 800);
        };

        tbody.appendChild(tr);
    });
    
    doc.getElementById('table-container').appendChild(table);

    doc.getElementById('exportBtn').onclick = () => {
        const headers = ['Selector', 'Tag', 'Accessible Name', 'Status', 'Issues'];
        const rows = items.map(item => {
            const escape = (txt) => '"' + (txt || '').replace(/"/g, '""') + '"';
            const status = item.issues.length > 0 ? 'Fail' : 'Pass';
            const issueText = item.issues.map(i => `[${i.id}] ${i.msg} (${i.severity})`).join('; ');
            
            return [
                escape(item.selector),
                escape(item.tag),
                escape(item.name),
                escape(status),
                escape(issueText)
            ].join(',');
        });
        
        const csvContent = [headers.join(',')].concat(rows).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = doc.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "accname_audit.csv");
        doc.body.appendChild(link);
        link.click();
        doc.body.removeChild(link);
    };

})();