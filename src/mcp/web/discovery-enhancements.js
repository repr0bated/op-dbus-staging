// Discovery Tab Enhancements
// Add these methods to MCPControlCenter class

// Enhanced service filtering
filterDiscoveryResults(searchTerm) {
    const term = searchTerm.toLowerCase();
    const services = document.querySelectorAll('.service-item');

    let visibleCount = 0;
    services.forEach(service => {
        const textContent = service.textContent.toLowerCase();
        const match = textContent.includes(term);
        service.style.display = match ? 'block' : 'none';
        if (match) visibleCount++;
    });

    // Update UI with results count
    const resultsInfo = document.getElementById('search-results-info');
    if (resultsInfo) {
        resultsInfo.textContent = `Showing ${visibleCount} of ${services.length} services`;
    }
}

// Export discovery results to JSON
exportDiscoveryResults() {
    if (this.services.length === 0) {
        this.showToast('No services to export', 'warning');
        return;
    }

    const data = {
        timestamp: new Date().toISOString(),
        total_services: this.services.length,
        categories: this.groupServicesByCategory(),
        services: this.services
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dbus-discovery-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('Discovery results exported', 'success');
}

// Copy service name to clipboard
copyServiceName(name) {
    navigator.clipboard.writeText(name).then(() => {
        this.showToast(`Copied: ${name}`, 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = name;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showToast(`Copied: ${name}`, 'success');
    });
}

// Get icon for service type
getServiceIcon(service) {
    const type = service.type || '';
    const name = service.name || '';

    if (name.includes('systemd')) return '⚙️';
    if (name.includes('NetworkManager')) return '🌐';
    if (name.includes('bluetooth')) return '📶';
    if (name.includes('sound') || name.includes('pulse')) return '🔊';
    if (name.includes('power') || name.includes('UPower')) return '🔋';
    if (name.includes('login')) return '👤';
    if (name.includes('display') || name.includes('gpu')) return '🖥️';
    if (name.includes('usb')) return '🔌';
    if (type === 'dbus-service') return '🔌';
    if (type === 'systemd-service') return '🔧';
    if (type === 'network-service') return '🌐';
    return '📦';
}

// Toggle all categories open
expandAllServices() {
    document.querySelectorAll('.service-details').forEach(details => {
        details.style.display = 'block';
    });
    this.showToast('All services expanded', 'info');
}

// Toggle all categories closed
collapseAllServices() {
    document.querySelectorAll('.service-details').forEach(details => {
        details.style.display = 'none';
    });
    this.showToast('All services collapsed', 'info');
}

// Filter by service category
filterByCategory(category) {
    const sections = document.querySelectorAll('.category-section');

    sections.forEach(section => {
        const header = section.querySelector('h3');
        if (!header) return;

        const sectionCategory = header.textContent.split('(')[0].trim();

        if (!category || sectionCategory === category) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
}

// Change discovery view mode
changeDiscoveryView(viewMode) {
    const container = document.getElementById('discovery-results');
    if (!container) return;

    // Remove existing view classes
    container.classList.remove('view-tree', 'view-list', 'view-grid');

    // Add new view class
    container.classList.add(`view-${viewMode}`);

    // Save preference
    localStorage.setItem('discoveryViewMode', viewMode);

    this.showToast(`Switched to ${viewMode} view`, 'info');
}

// Filter services by keyword
filterServices(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    const serviceItems = document.querySelectorAll('.service-item');

    let visibleCount = 0;

    serviceItems.forEach(item => {
        const serviceName = item.querySelector('.service-name')?.textContent.toLowerCase() || '';
        const serviceDesc = item.querySelector('.service-description')?.textContent.toLowerCase() || '';

        const matches = serviceName.includes(lowerKeyword) || serviceDesc.includes(lowerKeyword);

        item.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
    });

    // Update counts in category headers
    document.querySelectorAll('.category-section').forEach(section => {
        const visibleInCategory = section.querySelectorAll('.service-item:not([style*="display: none"])').length;
        const header = section.querySelector('h3');
        if (header) {
            const categoryName = header.textContent.split('(')[0].trim();
            header.textContent = `${categoryName} (${visibleInCategory})`;
        }

        // Hide empty categories
        section.style.display = visibleInCategory > 0 ? '' : 'none';
    });

    return visibleCount;
}
