/**
 * Automatic Property Information Detector
 * Extracts property details from microsite HTML content
 */

/**
 * Enhanced Property Detector
 * Automatically extracts property information from ANY microsite HTML
 * Works by analyzing the page content where the widget script is embedded
 */
export function detectPropertyFromPage() {
  try {
    const doc = document;
    const propertyInfo = {
      projectName: null,
      developer: null,
      location: null,
      availableBhk: [],
      pricing: {},
      area: null,
      amenities: [],
      possession: null,
      specialOffers: null,
    };

    // Get full page text for comprehensive analysis
    const pageText = doc.body?.textContent || '';
    const pageHTML = doc.documentElement?.innerHTML || '';

    // 1. Extract Project Name from multiple sources with enhanced detection
    const projectNameSources = [
      doc.querySelector('meta[property="og:title"]')?.content,
      doc.querySelector('meta[name="og:title"]')?.content,
      doc.querySelector('title')?.textContent,
      doc.querySelector('h1')?.textContent,
      doc.querySelector('[class*="project"] h1, [class*="banner"] h1, [class*="title"]')?.textContent,
      doc.querySelector('[class*="hero"] h1')?.textContent,
      doc.querySelector('[class*="main"] h1')?.textContent,
    ];
    
    // Also check for common project name patterns in text
    const projectNamePatterns = [
      /(?:project|property|apartment|residential)[:\s]+([A-Z][a-zA-Z\s&]+?)(?:\s+by|\s+at|\s+in|\s*$)/i,
      /([A-Z][a-zA-Z\s&]{3,30})\s+(?:by|from|at|in)\s+[A-Z]/,
    ];
    
    let detectedName = projectNameSources.find(name => name && name.trim())?.trim() || null;
    
    // Try pattern matching if no direct match
    if (!detectedName || detectedName.length > 100) {
      for (const pattern of projectNamePatterns) {
        const match = pageText.match(pattern);
        if (match && match[1] && match[1].length < 50) {
          detectedName = match[1].trim();
          break;
        }
      }
    }
    
    propertyInfo.projectName = detectedName;

    // Clean up project name (remove common suffixes and extra info)
    if (propertyInfo.projectName) {
      propertyInfo.projectName = propertyInfo.projectName
        .replace(/\s*-\s*.*$/, '') // Remove everything after dash
        .replace(/\s*\|\s*.*$/, '') // Remove everything after pipe
        .replace(/\s*Price.*$/i, '')
        .replace(/\s*Floor.*$/i, '')
        .replace(/\s*at\s+.*$/i, '') // Remove location suffix
        .replace(/\s*by\s+.*$/i, '') // Remove developer suffix
        .replace(/^.*:\s*/, '') // Remove "Project:" prefix
        .trim()
        .split('\n')[0] // Take first line only
        .substring(0, 100); // Limit length
    }

    // 2. Extract Developer with enhanced patterns
    const developerPatterns = [
      /by\s+([A-Z][a-zA-Z\s&]{2,40}?)(?:\s+\||\s+at|\s+in|\s*$)/i,
      /from\s+([A-Z][a-zA-Z\s&]{2,40}?)(?:\s+\||\s+at|\s+in|\s*$)/i,
      /developer[:\s]+([A-Z][a-zA-Z\s&]{2,40}?)(?:\s+\||\s+at|\s+in|\s*$)/i,
      /builder[:\s]+([A-Z][a-zA-Z\s&]{2,40}?)(?:\s+\||\s+at|\s+in|\s*$)/i,
      /constructed\s+by\s+([A-Z][a-zA-Z\s&]{2,40}?)(?:\s+\||\s+at|\s+in|\s*$)/i,
    ];
    
    for (const pattern of developerPatterns) {
      const match = pageText.match(pattern);
      if (match && match[1] && match[1].trim().length > 2 && match[1].trim().length < 50) {
        propertyInfo.developer = match[1].trim().split('\n')[0];
        break;
      }
    }

    // Also check meta tags and specific elements
    const developerElement = doc.querySelector('[class*="developer"], [class*="builder"], [class*="group"], [class*="builder-name"]');
    if (developerElement && !propertyInfo.developer) {
      const devText = developerElement.textContent?.trim();
      if (devText && devText.length < 100 && devText.length > 2) {
        propertyInfo.developer = devText.split('\n')[0].trim();
      }
    }
    
    // Check for "By [Developer]" in common sections
    if (!propertyInfo.developer) {
      const byPattern = /by\s+([A-Z][a-zA-Z\s&]{2,30})\s*[|,\-]/i;
      const bannerSection = doc.querySelector('[class*="banner"], [class*="hero"], [class*="intro"]');
      if (bannerSection) {
        const match = bannerSection.textContent.match(byPattern);
        if (match && match[1]) {
          propertyInfo.developer = match[1].trim();
        }
      }
    }

    // 3. Extract Location with enhanced patterns
    const locationSources = [
      doc.querySelector('meta[property="og:description"]')?.content,
      doc.querySelector('meta[name="description"]')?.content,
      doc.querySelector('[class*="location"]')?.textContent,
      doc.querySelector('[class*="address"]')?.textContent,
      doc.querySelector('[class*="banner"] [class*="subtitle"]')?.textContent,
      doc.querySelector('[class*="hero"] [class*="subtitle"]')?.textContent,
    ];
    
    const cities = ['Pune', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 
                   'Ahmedabad', 'Noida', 'Gurgaon', 'Thane', 'Navi Mumbai', 'Faridabad', 
                   'Ghaziabad', 'Dhanori', 'Lohegaon', 'Wakad', 'Hinjewadi', 'Baner', 'Kharadi',
                   'Kothrud', 'Aundh', 'Viman Nagar', 'Kalyani Nagar', 'Koregaon Park'];
    
    // Enhanced location patterns
    const locationPatterns = [
      /(?:at|in|near|located\s+in|situated\s+in)\s+([A-Z][a-zA-Z\s,-]+(?:Pune|Mumbai|Delhi|Bangalore|Hyderabad|Chennai|Kolkata|Ahmedabad|Noida|Gurgaon|Dhanori|Lohegaon|Wakad|Hinjewadi|Baner|Kharadi))/i,
      /([A-Z][a-zA-Z\s-]+)\s*[-–,|]\s*([A-Z][a-zA-Z\s]+(?:Pune|Mumbai|Delhi|Bangalore|Hyderabad|Chennai|Kolkata|Ahmedabad|Noida|Gurgaon))/i,
    ];
    
    for (const source of locationSources) {
      if (source) {
        // Try enhanced patterns first
        for (const pattern of locationPatterns) {
          const match = source.match(pattern);
          if (match) {
            if (match[2]) {
              // Pattern with area and city
              propertyInfo.location = `${match[1].trim()} - ${match[2].trim()}`;
            } else if (match[1] && match[1].length > 3) {
              propertyInfo.location = match[1].trim();
            }
            if (propertyInfo.location) break;
          }
        }
        if (propertyInfo.location) break;
        
        // Look for area - city pattern
        const areaCityMatch = source.match(/([A-Z][a-zA-Z\s-]{2,30})\s*[-–,|]\s*([A-Z][a-zA-Z\s]+)/);
        if (areaCityMatch && cities.some(c => areaCityMatch[2].includes(c))) {
          propertyInfo.location = `${areaCityMatch[1].trim()} - ${areaCityMatch[2].trim()}`;
          break;
        }
        
        // Fallback: extract any city name
        const cityMatch = source.match(new RegExp(`\\b(${cities.join('|')})\\b`, 'i'));
        if (cityMatch) {
          propertyInfo.location = cityMatch[1];
          break;
        }
      }
    }
    
    // Also check page text for location patterns
    if (!propertyInfo.location) {
      for (const pattern of locationPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          if (match[2]) {
            propertyInfo.location = `${match[1].trim()} - ${match[2].trim()}`;
          } else if (match[1] && match[1].length > 3) {
            propertyInfo.location = match[1].trim();
          }
          if (propertyInfo.location) break;
        }
      }
    }

    // 4. Extract BHK and Pricing with enhanced detection
    const priceSections = [
      doc.querySelector('[class*="price"], [id*="price"], [class*="pricing"]'),
      doc.querySelector('[class*="floor-plan"], [class*="typology"]'),
      doc.querySelector('table'),
      doc.querySelector('[class*="card"]'),
    ].filter(Boolean);
    
    // Also search entire page for pricing patterns
    const allPriceText = priceSections.map(s => s.textContent).join(' ') + ' ' + pageText;
    
    // Extract BHK options from entire page
    const bhkMatches = [...allPriceText.matchAll(/(\d+)\s*BHK/gi)];
    const uniqueBhks = new Set();
    for (const match of bhkMatches) {
      const bhk = `${match[1]} BHK`;
      uniqueBhks.add(bhk);
    }
    propertyInfo.availableBhk = Array.from(uniqueBhks);

    // Enhanced pricing extraction patterns
    const pricePatterns = [
      // Pattern: "2 BHK - ₹ 79.80 L" or "2 BHK ₹ 79.80 Lakhs"
      /(\d+)\s*BHK[^₹]*₹\s*([\d.,]+\s*(?:L|Cr|Lakhs?|Crores?|Lac|Crore)[^0-9]*)/gi,
      // Pattern: "₹ 79.80 L - 2 BHK"
      /₹\s*([\d.,]+)\s*(L|Cr|Lakhs?|Crores?|Lac|Crore)[^]*?(\d+)\s*BHK/gi,
      // Pattern: "Starting from ₹ 79.80 Lakhs" with BHK context
      /(?:starting\s+from|from)\s+₹\s*([\d.,]+)\s*(L|Cr|Lakhs?|Crores?)[^]*?(\d+)\s*[&,]\s*(\d+)\s*BHK/gi,
    ];

    for (const pattern of pricePatterns) {
      const matches = [...allPriceText.matchAll(pattern)];
      for (const match of matches) {
        if (match[3] && match[4]) {
          // Two BHKs mentioned
          const bhk1 = `${match[3]} BHK`;
          const bhk2 = `${match[4]} BHK`;
          const price = `₹ ${match[1]} ${match[2]}`;
          propertyInfo.pricing[bhk1] = price;
          propertyInfo.pricing[bhk2] = price;
        } else if (match[3]) {
          // Pattern: price then BHK
          const bhk = `${match[3]} BHK`;
          const price = `₹ ${match[1]} ${match[2]}`;
          propertyInfo.pricing[bhk] = price;
        } else if (match[1] && match[2]) {
          // Pattern: BHK then price
          const bhkNum = match[0].match(/(\d+)\s*BHK/)?.[1];
          if (bhkNum) {
            const bhk = `${bhkNum} BHK`;
            const price = `₹ ${match[1]} ${match[2]}`;
            propertyInfo.pricing[bhk] = price;
          }
        }
      }
    }
    
    // Also check for price ranges in same element
    priceSections.forEach(section => {
      const sectionText = section.textContent;
      const rows = section.querySelectorAll('tr, [class*="row"], [class*="card"]');
      rows.forEach(row => {
        const rowText = row.textContent;
        const bhkMatch = rowText.match(/(\d+)\s*BHK/i);
        const priceMatch = rowText.match(/₹\s*([\d.,]+)\s*(L|Cr|Lakhs?|Crores?|Lac|Crore)/i);
        if (bhkMatch && priceMatch) {
          const bhk = `${bhkMatch[1]} BHK`;
          const price = `₹ ${priceMatch[1]} ${priceMatch[2]}`;
          propertyInfo.pricing[bhk] = price;
        }
      });
    });

    // Also check banner/hero section for starting price
    const bannerSection = doc.querySelector('[class*="banner"], [class*="hero"]');
    if (bannerSection) {
      const bannerText = bannerSection.textContent;
      const startingPriceMatch = bannerText.match(/starting\s+from[^₹]*₹\s*([\d.,]+\s*(?:L|Cr|Lakhs?|Crores?))/i);
      if (startingPriceMatch && Object.keys(propertyInfo.pricing).length === 0) {
        propertyInfo.pricing['Starting From'] = `₹ ${startingPriceMatch[1]}`;
      }

      // Extract BHK from banner
      const bannerBhkMatch = bannerText.match(/(\d+)\s*&\s*(\d+)\s*BHK|(\d+)\s*BHK/gi);
      if (bannerBhkMatch) {
        bannerBhkMatch.forEach(match => {
          const bhks = match.match(/(\d+)/g);
          bhks?.forEach(num => {
            const bhk = `${num} BHK`;
            if (!propertyInfo.availableBhk.includes(bhk)) {
              propertyInfo.availableBhk.push(bhk);
            }
          });
        });
      }
    }

    // 5. Extract Area
    const areaMatch = pageText.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:Sq\.?ft|sqft|sq\.?\s*ft)/i) || 
                     pageText.match(/(\d+)\s*(?:Sq\.?ft|sqft|sq\.?\s*ft)/i);
    if (areaMatch) {
      if (areaMatch[2]) {
        propertyInfo.area = `${areaMatch[1]}-${areaMatch[2]} Sq.ft`;
      } else {
        propertyInfo.area = `${areaMatch[1]} Sq.ft`;
      }
    }

    // 6. Extract Amenities with enhanced detection
    const amenitiesSections = [
      doc.querySelector('[class*="amenit"], [id*="amenit"]'),
      doc.querySelector('[class*="feature"], [id*="feature"]'),
      doc.querySelector('[class*="facilit"], [id*="facilit"]'),
    ].filter(Boolean);
    
    const amenitySet = new Set();
    
    amenitiesSections.forEach(section => {
      // Get all potential amenity elements
      const amenityElements = section.querySelectorAll('li, [class*="amenit"], [class*="item"], [class*="feature"], div, span');
      
      amenityElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 50 && text.length > 2) {
          // Filter out common non-amenity text
          const isAmenity = !text.match(/^(amenit|feature|facilit|our|the|and|or)$/i) && 
                            !text.match(/^\d+$/) &&
                            !text.match(/^[A-Z]$/) &&
                            !text.match(/^[a-z]$/) &&
                            !text.includes('...') &&
                            text.split(' ').length < 8; // Not too long
          
          if (isAmenity && !amenitySet.has(text.toLowerCase())) {
            amenitySet.add(text.toLowerCase());
            propertyInfo.amenities.push(text);
          }
        }
      });
    });
    
    // Also look for common amenity keywords in page text
    const commonAmenities = [
      'clubhouse', 'swimming pool', 'gym', 'fitness', 'park', 'garden', 'playground',
      'security', 'parking', 'lift', 'power backup', 'water supply', 'club zone',
      'yoga', 'meditation', 'sports', 'court', 'badminton', 'tennis', 'jogging',
      'walking', 'track', 'landscaped', 'rooftop', 'terrace', 'party hall', 'community'
    ];
    
    commonAmenities.forEach(amenity => {
      if (pageText.toLowerCase().includes(amenity) && !amenitySet.has(amenity)) {
        propertyInfo.amenities.push(amenity.charAt(0).toUpperCase() + amenity.slice(1));
        amenitySet.add(amenity);
      }
    });

    // Limit amenities to reasonable number and remove duplicates
    propertyInfo.amenities = [...new Set(propertyInfo.amenities)].slice(0, 25);

    // 7. Extract Special Offers
    const offerPatterns = [
      /(pay\s+\d+%[^.!?]*)/i,
      /(no\s+bank\s+loan[^.!?]*)/i,
      /(special\s+offer[^.!?]*)/i,
      /(limited\s+time[^.!?]*)/i,
    ];
    for (const pattern of offerPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        propertyInfo.specialOffers = match[1].trim();
        break;
      }
    }

    // 8. Extract Possession (if mentioned)
    const possessionMatch = pageText.match(/(ready\s+to\s+move|possession[^.!?]*|rera\s+registered)/i);
    if (possessionMatch) {
      propertyInfo.possession = possessionMatch[0];
    }

    // Clean up and validate
    const cleanedInfo = {};
    if (propertyInfo.projectName) cleanedInfo.projectName = propertyInfo.projectName;
    if (propertyInfo.developer) cleanedInfo.developer = propertyInfo.developer;
    if (propertyInfo.location) cleanedInfo.location = propertyInfo.location;
    if (propertyInfo.availableBhk.length > 0) cleanedInfo.availableBhk = propertyInfo.availableBhk;
    if (Object.keys(propertyInfo.pricing).length > 0) cleanedInfo.pricing = propertyInfo.pricing;
    if (propertyInfo.area) cleanedInfo.area = propertyInfo.area;
    if (propertyInfo.amenities.length > 0) cleanedInfo.amenities = propertyInfo.amenities;
    if (propertyInfo.possession) cleanedInfo.possession = propertyInfo.possession;
    if (propertyInfo.specialOffers) cleanedInfo.specialOffers = propertyInfo.specialOffers;

    console.log("HomesfyChat: Detected property info from page:", cleanedInfo);
    return Object.keys(cleanedInfo).length > 0 ? cleanedInfo : null;
  } catch (error) {
    console.warn("HomesfyChat: Failed to detect property from page", error);
    return null;
  }
}

