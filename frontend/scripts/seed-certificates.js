// This is a sample seed script to add some initial certificates
// You can run this in your browser console when on the certificates page

const sampleCertificates = [
  {
    name: "AWS Certified Solutions Architect - Associate",
    code: "SAA-C03"
  },
  {
    name: "AWS Certified Developer - Associate", 
    code: "DVA-C02"
  },
  {
    name: "AWS Certified SysOps Administrator - Associate",
    code: "SOA-C02"
  },
  {
    name: "AWS Certified Solutions Architect - Professional",
    code: "SAP-C02"
  },
  {
    name: "AWS Certified DevOps Engineer - Professional",
    code: "DOP-C02"
  }
];

// Function to seed certificates
async function seedCertificates() {
  console.log('Starting to seed certificates...');
  
  for (const cert of sampleCertificates) {
    try {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cert),
      });
      
      if (response.ok) {
        console.log(`✅ Created: ${cert.name} (${cert.code})`);
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create ${cert.name}: ${error.error}`);
      }
    } catch (error) {
      console.log(`❌ Error creating ${cert.name}:`, error);
    }
  }
  
  console.log('Seeding completed!');
}

// Uncomment the line below to run the seeding
// seedCertificates();
