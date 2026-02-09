(function() {
    /**
     * Interactive Nesting Bookmarklet
     * Flags invalid nested interactive controls (e.g. <button> inside <a>)
     * Based on HTML5 Content Models and ARIA Spec
     */

    // Elements that cannot contain other interactive elements
    const containers = [
        'a[href]',
        'button',
        '[role="button"]',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="menuitemcheckbox"]',
        '[role="menuitemradio"]',
        '[role="option"]',
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="switch"]'
    ];

    // Elements that are considered interactive (and thus cannot be children of the above)
    const interactive = [
        'a[href]',
        'button',
        'input:not([type="hidden"])',
        'select',
        'textarea',
        'details',
        'embed',
        'iframe',
        'label', // Label is interactive, but special case (can contain input)
        '[role="button"]',
        '[role="link"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="switch"]',
        '[role="textbox"]',
        '[role="combobox"]',
        '[role="listbox"]',
        '[role="menu"]',
        '[role="tab"]',
        '[tabindex="0"]' // Generic focusable elements
    ];

    const containerSelector = containers.join(', ');
    const interactiveSelector = interactive.join(', ');

    const issues = [];

    document.querySelectorAll(interactiveSelector).forEach(child => {
        // Skip if not visible
        if (child.offsetParent === null) return;

        // Walk up the tree to find an interactive parent
        let parent = child.parentElement;
        while (parent && parent !== document.body) {
            // Check if parent matches any prohibited container selector
            if (parent.matches(containerSelector)) {
                
                // Exception: label containing input is valid
                if (parent.tagName.toLowerCase() === 'label' && 
                   (child.tagName.toLowerCase() === 'input' || child.tagName.toLowerCase() === 'select' || child.tagName.toLowerCase() === 'textarea')) {
                    parent = parent.parentElement;
                    continue;
                }

                // Exception: nested listboxes/menus/grids sometimes use aria-owns or specific patterns, 
                // but direct DOM nesting of interactive controls is usually bad.
                // We'll flag it.

                // Avoid double reporting (if A > B > C, report C inside B, and B inside A)
                // We are currently at C. Parent is B.
                // If B is also interactive, it will be caught when we process B.
                
                const pRole = parent.getAttribute('role');
                const pTagDisplay = pRole ? `&lt;${parent.tagName.toLowerCase()} role="${pRole}"&gt;` : `&lt;${parent.tagName.toLowerCase()}&gt;`;

                issues.push({
                    child: child,
                    childTag: child.tagName.toLowerCase(),
                    childRole: child.getAttribute('role') || '(implicit)',
                    parent: parent,
                    parentTag: parent.tagName.toLowerCase(),
                    parentRole: pRole || '(implicit)',
                    msg: `Nested Interactive Controls: &lt;${child.tagName.toLowerCase()}&gt; inside ${pTagDisplay}`
                });
                
                // Stop after finding the closest interactive ancestor to avoid noise
                break;
            }
            parent = parent.parentElement;
        }
    });

    // --- Output ---
    const win = window.open('', 'InteractiveNestingAudit', 'width=1000,height=700,scrollbars=yes,resizable=yes');
    if (!win) { alert('Popups blocked'); return; }
    
    const doc = win.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Interactive Nesting Audit</title>
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
                .tag-child { color: #0052cc; font-weight: bold; }
                .tag-parent { color: #bf2600; font-weight: bold; }
            </style>
        </head>
        <body>
            <header>
                <h1>Invalid Nested Interactive Controls</h1>
                <div class="count">Found ${issues.length} issues</div>
                <div style="margin-top: 15px; padding: 15px; background: #e3fcef; border-radius: 6px; border: 1px solid #006644; color: #006644; font-size: 13px;">
                    <strong>Recommended Fixes:</strong>
                    <ul style="margin: 5px 0 0 20px; padding: 0;">
                        <li><strong>Refactor Layout (Siblings):</strong> Move the inner interactive element out of the parent so they are DOM siblings. Use CSS (absolute positioning) to visually overlay them if needed.</li>
                        <li><strong>Remove Redundancy:</strong> If the outer element is already actionable (e.g. an accordion header), remove the inner interactive element (e.g. the chevron button) and just use a non-interactive icon.</li>
                        <li><strong>Simplify Tab Stops:</strong> Consolidate nested controls into a single interactive element to improve keyboard navigation and avoid "tab traps".</li>
                    </ul>
                </div>
            </header>
            <div id="table-container"></div>
        </body>
        </html>
    `);
    doc.close();

    if (issues.length === 0) {
        const msg = doc.createElement('div');
        msg.style.padding = '20px';
        msg.style.textAlign = 'center';
        msg.style.color = '#006644';
        msg.innerHTML = '<h3>No nested interactive controls found!</h3>';
        doc.getElementById('table-container').appendChild(msg);
        return;
    }

    const table = doc.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Child (Inner)</th>
                <th>Parent (Outer)</th>
                <th>Issue</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    issues.forEach(item => {
        const tr = doc.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="tag-child">&lt;${item.childTag}&gt;</div>
                <div style="font-size: 11px; color: #666;">role="${item.childRole}"</div>
            </td>
            <td>
                <div class="tag-parent">&lt;${item.parentTag}&gt;</div>
                <div style="font-size: 11px; color: #666;">role="${item.parentRole}"</div>
            </td>
            <td>${item.msg}</td>
        `;
        
        tr.onclick = () => {
            window.focus();
            item.child.scrollIntoView({behavior: 'auto', block: 'center'});
            item.child.focus();
            const oldOutline = item.child.style.outline;
            const oldParentOutline = item.parent.style.outline;
            
            item.child.style.outline = '4px solid #0052cc'; // Blue for child
            item.parent.style.outline = '4px solid #bf2600'; // Red for parent
            
            setTimeout(() => { 
                item.child.style.outline = oldOutline; 
                item.parent.style.outline = oldParentOutline;
            }, 2000);
        };
        
        tbody.appendChild(tr);
    });

    doc.getElementById('table-container').appendChild(table);

})();