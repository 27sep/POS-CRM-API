const axios = require('axios');
const cheerio = require('cheerio');

let contactId = 1;

const scrapeWebsiteContacts = async (url) => {
  try {
    console.log(`Scraping URL: ${url}`);
    
    // Add more browser-like headers to avoid being blocked
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(data);
    const contacts = [];
    const extractedData = {
      emails: new Set(),
      phones: new Set(),
      names: new Set()
    };

    // Method 1: Look for specific contact page elements
    console.log('Looking for contact information in common elements...');

    // Check mailto links (most reliable for emails)
    $('a[href^="mailto:"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        const email = href.replace('mailto:', '').split('?')[0].trim();
        if (email && isValidEmail(email)) {
          extractedData.emails.add(email);
          console.log(`Found email from mailto: ${email}`);
        }
      }
    });

    // Check tel links (most reliable for phones)
    $('a[href^="tel:"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        const phone = href.replace('tel:', '').trim();
        if (phone && isValidPhone(phone)) {
          extractedData.phones.add(phone);
          console.log(`Found phone from tel: ${phone}`);
        }
      }
    });

    // Look for specific contact sections/divs
    const contactSelectors = [
      '.contact', '#contact', '.contact-info', '.contact-details',
      '.team-member', '.employee', '.staff', '.profile',
      '.author', '.contributor', '.founder', '.executive',
      'address', '.address', '.location'
    ];

    contactSelectors.forEach(selector => {
      $(selector).each((i, el) => {
        const elementText = $(el).text().replace(/\s+/g, ' ').trim();
        
        // Extract emails from this element
        const elementEmails = extractEmails(elementText);
        elementEmails.forEach(email => extractedData.emails.add(email));
        
        // Extract phones from this element
        const elementPhones = extractPhones(elementText);
        elementPhones.forEach(phone => extractedData.phones.add(phone));
        
        // Look for names near contact info
        const possibleName = extractName(elementText);
        if (possibleName) extractedData.names.add(possibleName);
      });
    });

    // Method 2: Check meta tags and structured data
    $('meta[name="author"], meta[property="article:author"], meta[name="twitter:creator"]').each((i, el) => {
      const content = $(el).attr('content');
      if (content && content.includes('@')) {
        // Could be Twitter handle or email
        if (content.includes('@') && !content.includes('.')) {
          // Twitter handle - ignore for now
        } else if (content.includes('@') && content.includes('.')) {
          extractedData.emails.add(content);
        }
      }
    });

    // Method 3: Check for JSON-LD structured data (common in modern sites)
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const jsonData = JSON.parse($(el).html());
        extractFromJSON(jsonData, extractedData);
      } catch (e) {
        // Ignore parsing errors
      }
    });

    // Method 4: Scan all text as fallback
    console.log('Scanning all page text as fallback...');
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Extract emails
    const allEmails = extractEmails(bodyText);
    allEmails.forEach(email => extractedData.emails.add(email));
    
    // Extract phones
    const allPhones = extractPhones(bodyText);
    allPhones.forEach(phone => extractedData.phones.add(phone));
    
    // Extract names (looking for patterns near contact info)
    const namePatterns = [
      /([A-Z][a-z]+ [A-Z][a-z]+)/g,  // Simple name
      /(?:name["']?\s*:\s*["']([^"']+)["'])/i,  // JSON-like name
      /(?:by\s+([A-Z][a-z]+ [A-Z][a-z]+))/i,  // "by John Doe"
      /(?:author["']?\s*:\s*["']([^"']+)["'])/i  // author field
    ];

    namePatterns.forEach(pattern => {
      const matches = bodyText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Clean up the match if it's from a pattern with groups
          if (Array.isArray(match)) {
            match = match[1] || match[0];
          }
          if (typeof match === 'string' && match.length > 3 && match.length < 50) {
            extractedData.names.add(match.replace(/["']/g, '').trim());
          }
        });
      }
    });

    // Method 5: Look for common name patterns in headings and strong tags near contact info
    $('h1, h2, h3, h4, strong, b').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 3 && text.length < 50 && /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text)) {
        extractedData.names.add(text);
      }
    });

    // Convert Sets to Arrays and remove invalid/empty values
    const emails = [...extractedData.emails].filter(e => e && e.length > 3);
    const phones = [...extractedData.phones].filter(p => p && p.length > 5);
    const names = [...extractedData.names].filter(n => n && n.length > 2);

    console.log(`Found ${emails.length} emails, ${phones.length} phones, ${names.length} names`);

    // Create contacts intelligently
    const contactMap = new Map();

    // First, associate emails with names and phones based on proximity
    emails.forEach((email, index) => {
      contactMap.set(email, {
        id: contactId++,
        email: email,
        name: names[index] || extractNameFromEmail(email) || "Unknown",
        phone: phones[index] || null,
        position: null,
        company: extractCompanyFromEmail(email) || null,
        source: url
      });
    });

    // Add remaining phones that don't have associated emails
    if (phones.length > emails.length) {
      for (let i = emails.length; i < phones.length; i++) {
        const phone = phones[i];
        if (![...contactMap.values()].some(c => c.phone === phone)) {
          contactMap.set(`phone-${i}`, {
            id: contactId++,
            name: names[i] || "Unknown",
            email: null,
            phone: phone,
            position: null,
            company: null,
            source: url
          });
        }
      }
    }

    // Add remaining names that don't have associated contacts
    if (names.length > emails.length && names.length > phones.length) {
      for (let i = Math.max(emails.length, phones.length); i < names.length; i++) {
        const name = names[i];
        if (![...contactMap.values()].some(c => c.name === name)) {
          contactMap.set(`name-${i}`, {
            id: contactId++,
            name: name,
            email: null,
            phone: null,
            position: null,
            company: null,
            source: url
          });
        }
      }
    }

    const finalContacts = [...contactMap.values()];
    console.log(`Created ${finalContacts.length} contacts`);
    
    return finalContacts;

  } catch (error) {
    console.error('Error scraping website contacts:', error.message);
    return [];
  }
};

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  // Remove common separators for validation
  const clean = phone.replace(/[\s\-\.\(\)]/g, '');
  return /^\+?\d{10,15}$/.test(clean);
}

function extractEmails(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.match(emailRegex) || [];
}

function extractPhones(text) {
  // Multiple phone patterns
  const patterns = [
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,  // Standard US
    /\+\d{1,3}\s?\d{9,12}/g,  // International
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g  // Simple with separators
  ];
  
  let allPhones = [];
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) allPhones = allPhones.concat(matches);
  });
  
  // Remove duplicates and clean
  return [...new Set(allPhones)].map(p => p.trim());
}

function extractName(text) {
  // Look for common name patterns
  const patterns = [
    /([A-Z][a-z]+ [A-Z][a-z]+)/,
    /(?:name["']?\s*:\s*["']([^"']+)["'])/i,
    /(?:full_name["']?\s*:\s*["']([^"']+)["'])/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  return null;
}

function extractNameFromEmail(email) {
  const localPart = email.split('@')[0];
  // Convert common patterns (john.doe -> John Doe, john_doe -> John Doe)
  const name = localPart
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  if (name.includes(' ') && name.length > 3) {
    return name;
  }
  return null;
}

function extractCompanyFromEmail(email) {
  const domain = email.split('@')[1];
  if (domain) {
    // Remove common TLDs and get company name
    return domain.split('.')[0].replace(/^www\./, '');
  }
  return null;
}

function extractFromJSON(obj, extractedData) {
  if (!obj || typeof obj !== 'object') return;
  
  // Common fields in structured data
  const emailFields = ['email', 'contactPoint', 'emailaddress'];
  const phoneFields = ['telephone', 'phone', 'contactNumber'];
  const nameFields = ['name', 'fullName', 'givenName', 'familyName', 'author', 'creator'];
  
  if (Array.isArray(obj)) {
    obj.forEach(item => extractFromJSON(item, extractedData));
  } else {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      if (emailFields.includes(key.toLowerCase()) && typeof value === 'string' && isValidEmail(value)) {
        extractedData.emails.add(value);
      }
      
      if (phoneFields.includes(key.toLowerCase()) && typeof value === 'string' && isValidPhone(value)) {
        extractedData.phones.add(value);
      }
      
      if (nameFields.includes(key.toLowerCase()) && typeof value === 'string' && value.length > 2) {
        extractedData.names.add(value);
      }
      
      if (typeof value === 'object') {
        extractFromJSON(value, extractedData);
      }
    });
  }
}

// Improved LinkedIn scraper (still placeholder but with better structure)
const scrapeLinkedIn = async (url) => {
    try {
        console.log(`Scraping LinkedIn data for URL: ${url}`);
        // In production, use LinkedIn API or Bright Data/LinkedIn Scraper API
        return [
            { 
                id: contactId++,
                name: 'John Smith', // Placeholder
                email: 'john.smith@example.com', // Placeholder
                phone: '+1 (555) 123-4567', // Placeholder
                position: 'Software Engineer',
                company: 'Tech Company',
                source: url 
            }
        ];
    } catch (error) {
        console.error(`Failed to scrape LinkedIn: ${error.message}`);
        return [];
    }
};

// Improved Twitter scraper (placeholder)
const scrapeTwitter = async (url) => {
    try {
        console.log(`Scraping Twitter data for URL: ${url}`);
        // In production, use Twitter API or scraping service
        return [
            { 
                id: contactId++,
                name: 'Twitter User', 
                email: 'user@example.com', // Rarely available
                phone: null,
                username: '@exampleUser', 
                position: null,
                company: null,
                source: url 
            }
        ];
    } catch (error) {
        console.error(`Failed to scrape Twitter: ${error.message}`);
        return [];
    }
};

module.exports = {
    scrapeWebsiteContacts,
    scrapeLinkedIn,
    scrapeTwitter
};