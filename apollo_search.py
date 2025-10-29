import requests
import time

# CONFIG
API_KEY = "PGD-XmtalEwFgU5IiPtLqw"  # Replace with your real API key
SEARCH_URL = "https://api.apollo.io/api/v1/mixed_people/search"
# ENRICH_URL = "https://api.apollo.io/api/v1/contacts/enrich"
ENRICH_URL = "https://api.apollo.io/api/v1/people/enrich"


HEADERS = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "x-api-key": API_KEY
}

# Parameters for search
SEARCH_PARAMS = {
    "person_locations": ["Florida, United States"],  # You can modify location
    "page": 1,
    "per_page": 10  # Number of people per page
}

def search_people(page):
    SEARCH_PARAMS["page"] = page
    url = f"{SEARCH_URL}?reveal_personal_emails=true&reveal_phone_number=true"
    response = requests.post(url, headers=HEADERS, json=SEARCH_PARAMS)
    if response.status_code != 200:
        print(f"[ERROR] Search API failed on page {page}: {response.status_code} - {response.text}")
        return []
    data = response.json()
    return data.get("people", [])

def enrich_contact(person_id):
    payload = {
        "person_id": person_id
    }

    webhook_url = "https://webhook.site/77fcaad8-17c7-4660-b954-706556204b9f"  # Replace with your real webhook
    url = f"{ENRICH_URL}?reveal_personal_emails=true&reveal_phone_number=true&webhook_url={webhook_url}"

    response = requests.post(url, headers=HEADERS, json=payload)
    
    if response.status_code != 200:
        print(f"[ERROR] Enrich failed for ID {person_id}: {response.status_code} - {response.text}")
        return None
    
    return response.json()



def main():
    max_pages = 5  # Change to go beyond 5 pages if needed

    for page in range(1, max_pages + 1):
        print(f"\n Searching page {page}...")
        people = search_people(page)
        
        if not people:
            print("No more people found.")
            break
        
        for person in people:
            person_id = person.get("id")
            full_name = f"{person.get('first_name')} {person.get('last_name')}"
            print(f" Enriching: {full_name} (ID: {person_id})")

            enriched = enrich_contact(person_id)
            if enriched:
                phones = enriched.get("person", {}).get("mobile_phone", "N/A")
                email = enriched.get("person", {}).get("email", "N/A")
                print(f" Phone: {phones} | 📧 Email: {email}")
            time.sleep(0.5)  # Prevent hitting rate limits

if __name__ == "__main__":
    main()