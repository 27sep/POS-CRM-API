const axios = require('axios');
const cheerio = require('cheerio');

let contactId = 1;

const scrapeWebsiteContacts = async (url) => {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const contacts = [];
    const rawText = $('body').text();

    // Regex Patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+\d{1,3}[- ]?)?\d{10,12}/g;
    const nameRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;

    // Extract emails, phones, and names
    const emails = rawText.match(emailRegex) || [];
    const phones = rawText.match(phoneRegex) || [];
    const names = rawText.match(nameRegex) || [];

    // Loop through emails to create structured contact info
    emails.forEach((email, index) => {
      contacts.push({
        id: contactId++,
        name: names[index] || "N/A",
        email,
        phone: phones[index] || "N/A",
        position: "N/A",
        company: "N/A",
        source: url,
      });
    });

    // If there are more phones than emails, add them separately
    if (phones.length > emails.length) {
      phones.slice(emails.length).forEach((phone) => {
        contacts.push({
          id: contactId++,
          name: "N/A",
          email: "N/A",
          phone,
          position: "N/A",
          company: "N/A",
          source: url,
        });
      });
    }

    return contacts;
  } catch (error) {
    console.error('Error scraping website contacts:', error.message);
    return [];
  }
};


// Scrape contacts from LinkedIn (Placeholder - LinkedIn scraping requires authenticated API or custom implementation)
const scrapeLinkedIn = async (url) => {
    try {
        // Placeholder logic: replace with your LinkedIn scraping logic
        console.log(`Scraping LinkedIn data for URL: ${url}`);
        return [
            { name: 'LinkedIn Contact', email: 'example@linkedin.com', position: 'Software Engineer' }
        ];
    } catch (error) {
        console.error(`Failed to scrape LinkedIn: ${error.message}`);
        throw new Error('LinkedIn scraping failed');
    }
};

// Scrape contacts from Twitter (Placeholder - Twitter scraping may require Twitter API)
const scrapeTwitter = async (url) => {
    try {
        // Placeholder logic: replace with your Twitter scraping logic
        console.log(`Scraping Twitter data for URL: ${url}`);
        return [
            { name: 'Twitter Contact', username: '@exampleUser', profile: url }
        ];
    } catch (error) {
        console.error(`Failed to scrape Twitter: ${error.message}`);
        throw new Error('Twitter scraping failed');
    }
};

module.exports = {
    scrapeWebsiteContacts,
    scrapeLinkedIn,
    scrapeTwitter
};
