document.addEventListener('DOMContentLoaded', function () {
	// Add structured data for SEO
	var schema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Intune Assignments Manager',
		description:
			'A web application for bulk-managing Microsoft Intune app and configuration profile assignments via the Microsoft Graph API',
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Web Browser',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
		},
		author: {
			'@type': 'Person',
			name: 'Rob Knighton',
			url: 'https://m7kni.io',
		},
		url: 'https://m7kni.io/intune-assignments-manager/',
		softwareRequirements: 'Modern web browser with JavaScript enabled',
		applicationSubCategory: 'IT Administration',
	};

	var script = document.createElement('script');
	script.type = 'application/ld+json';
	script.text = JSON.stringify(schema);
	document.head.appendChild(script);
});
