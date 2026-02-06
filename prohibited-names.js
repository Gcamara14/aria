javascript:(function(){
    /**
     * Prohibited Names Bookmarklet
     * Flags elements that have aria-label/labelledby but shouldn't (ARIA 1.2)
     * 
     * RULE: Generic elements (div, span) and presentational/inline elements (label, p, b, i, etc.)
     * MUST NOT have aria-label or aria-labelledby.
     * 
     * FIX: Move the naming attribute to the interactive child element (input, button, a) 
     * or use visible text.
     */

    const prohibitedRoles = [
        'caption', 'code', 'deletion', 'emphasis', 'generic', 
        'insertion', 'paragraph', 'presentation', 'none', 
        'strong', 'subscript', 'superscript'
    ];

    const items = [];
    
    document.querySelectorAll('*').forEach(el => {
        if (el.nodeType !== 1) return;
        
        const hasLabel = el.hasAttribute('aria-label');
        const hasLabelledBy = el.hasAttribute('aria-labelledby');
        
        if (!hasLabel && !hasLabelledBy) return;

        const role = el.getAttribute('role');
        const tag = el.tagName.toLowerCase();
        let error = null;

        // 1. Explicit Role Check
        if (role && prohibitedRoles.includes(role)) {
            error = `Role "${role}" prohibits naming attributes`;
        }
        // 2. Implicit Generic Check (div/span)
        else if (!role && (tag === 'div' || tag === 'span')) {
            error = `Generic <${tag}> prohibits naming attributes`;
        }
        // 3. Other Implicit Prohibitions
        else if (!role && ['p', 'b', 'i', 'strong', 'em', 'code', 's', 'u', 'label'].includes(tag)) {
            error = `<${tag}> prohibits naming attributes`;
        }

        if (error) {
            let suggestion = 'Remove attribute';
            
            // Look for interactive children to suggest moving the label to
            const interactive = el.querySelector('input, button, a[href], select, textarea');
            
            if (interactive) {
                const childTag = interactive.tagName.toLowerCase();
                suggestion = `Move aria-label to &lt;${childTag}&gt; child`;
            } else if (tag === 'label') {
                suggestion = 'Remove (use visible text inside label)';
            } else {
                suggestion = 'Remove attribute (or add role="group" if container)';
            }

            items.push({
                element: el,
                tag: tag,
                role: role || '(implicit)',
                attr: hasLabel ? 'aria-label' : 'aria-labelledby',
                val: hasLabel ? el.getAttribute('aria-label') : document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || '[ID ref]',
                error: error,
                suggestion: suggestion
            });
        }
    });

    // --- Output ---
    const win = window.open('', 'ProhibitedNamesAudit', 'width=1100,height=700,scrollbars=yes,resizable=yes');
    if (!win) { alert('Popups blocked'); return; }
    
    const doc = win.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Prohibited Naming Attributes</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #f4f5f7; color: #172b4d; }
                header { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin-bottom: 20px; }
                h1 { margin: 0 0 10px 0; font-size: 24px; color: #bf2600; }
                .count { font-size: 16px; color: #5e6c84; }
                table { width: 100%; background: #fff; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                th { background: #fafbfc; text-align: left; padding: 12px; border-bottom: 2px solid #dfe1e6; font-size: 12px; text-transform: uppercase; color: #5e6c84; }
                td { padding: 12px; border-bottom: 1px solid #dfe1e6; font-size: 14px; vertical-align: top; }
                tr:hover { background: #ffebeb !important; cursor: pointer; }
                code { background: #ebecf0; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 12px; }
                .attr-val { color: #0052cc; font-style: italic; }
                .suggestion { color: #006644; font-weight: bold; }
            </style>
        </head>
        <body>
            <header>
                <h1>Prohibited Names Found</h1>
                <div class="count">Found ${items.length} issues</div>
                <div style="margin-top: 15px; padding: 15px; background: #e3fcef; border-radius: 6px; border: 1px solid #006644; color: #006644; font-size: 13px;">
                    <strong>Recommended Fix Scenarios:</strong>
                    <ul style="margin: 5px 0 0 20px; padding: 0;">
                        <li><strong>Scenario A (Interactive Child):</strong> If the container holds an input/button, move the <code>aria-label</code> to that interactive element.</li>
                        <li><strong>Scenario B (Label):</strong> A <code>&lt;label&gt;</code> should not have an <code>aria-label</code>. Put the text inside the label or on the input.</li>
                        <li><strong>Scenario C (Generic Container):</strong> If it's just a container, remove the attribute. If it's a landmark, add <code>role="region"</code> or <code>role="group"</code>.</li>
                        <li><strong>Note:</strong> Avoid <code>role="text"</code>, <code>role="img"</code>, or <code>role="button"</code> on containers with interactive children. These roles have "Children Presentational: True", which strips semantics from all descendants.</li>
                    </ul>
                </div>
            </header>
            <div id="table-container"></div>
        </body>
        </html>
    `);
    doc.close();

    if (items.length === 0) {
        const msg = doc.createElement('div');
        msg.style.padding = '20px';
        msg.style.textAlign = 'center';
        msg.style.color = '#006644';
        msg.innerHTML = '<h3>No prohibited naming attributes found!</h3>';
        doc.getElementById('table-container').appendChild(msg);
        return;
    }

    const table = doc.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Element</th>
                <th>Attribute</th>
                <th>Value</th>
                <th>Error</th>
                <th>Suggested Fix</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    items.forEach(item => {
        const tr = doc.createElement('tr');
        tr.innerHTML = `
            <td><code>&lt;${item.tag}&gt;</code></td>
            <td><code>${item.attr}</code></td>
            <td class="attr-val">${item.val}</td>
            <td style="color: #bf2600; font-weight: 500;">${item.error}</td>
            <td class="suggestion">${item.suggestion}</td>
        `;
        
        tr.onclick = () => {
            window.focus();
            item.element.scrollIntoView({behavior: 'auto', block: 'center'});
            item.element.focus();
            const oldOutline = item.element.style.outline;
            item.element.style.outline = '4px solid #bf2600';
            setTimeout(() => { item.element.style.outline = oldOutline; }, 1500);
        };
        
        tbody.appendChild(tr);
    });

    doc.getElementById('table-container').appendChild(table);

})();