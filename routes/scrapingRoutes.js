const router = require('express').Router();
const { scrapeContacts, saveScrapedContacts } = require('../controllers/scrapingController');

// Route for scraping contacts from various sources
router.post('/scrape-contacts', scrapeContacts);

// Route for saving scraped contacts to a campaign
router.post('/campaigns/save-contacts', saveScrapedContacts);

module.exports = router;
