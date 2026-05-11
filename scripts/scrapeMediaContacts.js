#!/usr/bin/env node
/**
 * Scrape les pages publiques (staff, about, contact, masthead, team…)
 * des médias US food/health/wellness pour extraire les emails publiés
 * en clair, et exclut ceux déjà obtenus via Hunter.io.
 *
 * 100 % gratuit, sans clé API, sans quota.
 *
 * Usage:
 *   node scripts/scrapeMediaContacts.js
 *
 * Sortie:
 *   scripts/output/media-contacts-scraped.csv
 */

const https = require('https');
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};
function log(msg, c = 'reset') { console.log(`${colors[c]}${msg}${colors.reset}`); }

// Mêmes médias que Hunter (findMediaContacts.js)
const DOMAINS = [
  { domain: 'latimes.com', label: 'Los Angeles Times', city: 'Los Angeles' },
  { domain: 'la.eater.com', label: 'Eater LA', city: 'Los Angeles' },
  { domain: 'lamag.com', label: 'Los Angeles Magazine', city: 'Los Angeles' },
  { domain: 'laist.com', label: 'LAist', city: 'Los Angeles' },
  { domain: 'laweekly.com', label: 'LA Weekly', city: 'Los Angeles' },
  { domain: 'theinfatuation.com', label: 'The Infatuation', city: 'Los Angeles' },
  { domain: 'tastemade.com', label: 'Tastemade', city: 'Santa Monica' },
  { domain: 'kcrw.com', label: 'KCRW (Good Food)', city: 'Santa Monica' },
  { domain: 'dailynews.com', label: 'LA Daily News', city: 'Los Angeles' },
  { domain: 'timeout.com', label: 'Time Out', city: 'Los Angeles' },
  { domain: 'goop.com', label: 'Goop', city: 'Santa Monica' },
  { domain: 'thechalkboardmag.com', label: 'The Chalkboard Mag', city: 'Los Angeles' },
  { domain: 'poosh.com', label: 'Poosh', city: 'Calabasas' },
  { domain: 'nytimes.com', label: 'New York Times', city: 'New York' },
  { domain: 'newyorker.com', label: 'The New Yorker', city: 'New York' },
  { domain: 'nymag.com', label: 'New York Magazine / Grub Street', city: 'New York' },
  { domain: 'eater.com', label: 'Eater (national)', city: 'New York' },
  { domain: 'bonappetit.com', label: 'Bon Appétit', city: 'New York' },
  { domain: 'foodandwine.com', label: 'Food & Wine', city: 'New York' },
  { domain: 'epicurious.com', label: 'Epicurious', city: 'New York' },
  { domain: 'seriouseats.com', label: 'Serious Eats', city: 'New York' },
  { domain: 'thekitchn.com', label: 'The Kitchn', city: 'New York' },
  { domain: 'tastingtable.com', label: 'Tasting Table', city: 'New York' },
  { domain: 'delish.com', label: 'Delish', city: 'New York' },
  { domain: 'wellandgood.com', label: 'Well+Good', city: 'New York' },
  { domain: 'mindbodygreen.com', label: 'mindbodygreen', city: 'New York' },
  { domain: 'self.com', label: 'SELF', city: 'New York' },
  { domain: 'health.com', label: 'Health', city: 'New York' },
  { domain: 'shape.com', label: 'Shape', city: 'New York' },
  { domain: 'womenshealthmag.com', label: "Women's Health", city: 'New York' },
  { domain: 'menshealth.com', label: "Men's Health", city: 'New York' },
  { domain: 'prevention.com', label: 'Prevention', city: 'New York' },
  { domain: 'byrdie.com', label: 'Byrdie', city: 'New York' },
  { domain: 'foodnetwork.com', label: 'Food Network', city: 'New York' },
  { domain: 'washingtonpost.com', label: 'Washington Post', city: 'Washington DC' },
  { domain: 'wsj.com', label: 'Wall Street Journal', city: 'New York' },
  { domain: 'usatoday.com', label: 'USA Today', city: 'McLean VA' },
  { domain: 'cnn.com', label: 'CNN', city: 'Atlanta' },
  { domain: 'nbcnews.com', label: 'NBC News', city: 'New York' },
  { domain: 'cbsnews.com', label: 'CBS News', city: 'New York' },
  { domain: 'abcnews.go.com', label: 'ABC News', city: 'New York' },
  { domain: 'npr.org', label: 'NPR', city: 'Washington DC' },
  { domain: 'axios.com', label: 'Axios', city: 'Arlington VA' },
  { domain: 'politico.com', label: 'Politico', city: 'Arlington VA' },
  { domain: 'chicagotribune.com', label: 'Chicago Tribune', city: 'Chicago' },
  { domain: 'chicago.suntimes.com', label: 'Chicago Sun-Times', city: 'Chicago' },
  { domain: 'chicago.eater.com', label: 'Eater Chicago', city: 'Chicago' },
  { domain: 'timeoutchicago.com', label: 'Time Out Chicago', city: 'Chicago' },
  { domain: 'chicagomag.com', label: 'Chicago Magazine', city: 'Chicago' },
  { domain: 'sfchronicle.com', label: 'San Francisco Chronicle', city: 'San Francisco' },
  { domain: 'sf.eater.com', label: 'Eater SF', city: 'San Francisco' },
  { domain: 'sfgate.com', label: 'SFGate', city: 'San Francisco' },
  { domain: 'sfweekly.com', label: 'SF Weekly', city: 'San Francisco' },
  { domain: 'bostonglobe.com', label: 'Boston Globe', city: 'Boston' },
  { domain: 'boston.eater.com', label: 'Eater Boston', city: 'Boston' },
  { domain: 'bostonmagazine.com', label: 'Boston Magazine', city: 'Boston' },
  { domain: 'miamiherald.com', label: 'Miami Herald', city: 'Miami' },
  { domain: 'miaminewtimes.com', label: 'Miami New Times', city: 'Miami' },
  { domain: 'miami.eater.com', label: 'Eater Miami', city: 'Miami' },
  { domain: 'houstonchronicle.com', label: 'Houston Chronicle', city: 'Houston' },
  { domain: 'dallasnews.com', label: 'Dallas Morning News', city: 'Dallas' },
  { domain: 'statesman.com', label: 'Austin American-Statesman', city: 'Austin' },
  { domain: 'austin.eater.com', label: 'Eater Austin', city: 'Austin' },
  { domain: 'texasmonthly.com', label: 'Texas Monthly', city: 'Austin' },
  { domain: 'seattletimes.com', label: 'Seattle Times', city: 'Seattle' },
  { domain: 'seattle.eater.com', label: 'Eater Seattle', city: 'Seattle' },
  { domain: 'oregonlive.com', label: 'The Oregonian', city: 'Portland' },
  { domain: 'pdx.eater.com', label: 'Eater Portland', city: 'Portland' },
  { domain: 'ajc.com', label: 'Atlanta Journal-Constitution', city: 'Atlanta' },
  { domain: 'atlanta.eater.com', label: 'Eater Atlanta', city: 'Atlanta' },
  { domain: 'denverpost.com', label: 'Denver Post', city: 'Denver' },
  { domain: 'denver.eater.com', label: 'Eater Denver', city: 'Denver' },
  { domain: 'inquirer.com', label: 'Philadelphia Inquirer', city: 'Philadelphia' },
  { domain: 'philly.eater.com', label: 'Eater Philly', city: 'Philadelphia' },
  { domain: 'washingtonian.com', label: 'Washingtonian', city: 'Washington DC' },
  { domain: 'dc.eater.com', label: 'Eater DC', city: 'Washington DC' },
  { domain: 'everydayhealth.com', label: 'Everyday Health', city: 'New York' },
  { domain: 'healthline.com', label: 'Healthline', city: 'San Francisco' },
  { domain: 'verywellhealth.com', label: 'Verywell Health', city: 'New York' },
  { domain: 'medicalnewstoday.com', label: 'Medical News Today', city: 'National' },
  { domain: 'webmd.com', label: 'WebMD', city: 'New York' },
  { domain: 'consumerreports.org', label: 'Consumer Reports', city: 'Yonkers' },
  { domain: 'foodsafetynews.com', label: 'Food Safety News', city: 'National' },
  { domain: 'foodnavigator-usa.com', label: 'FoodNavigator USA', city: 'National' },
  { domain: 'fooddive.com', label: 'Food Dive', city: 'National' },
  { domain: 'foodbusinessnews.net', label: 'Food Business News', city: 'Kansas City' },
  { domain: 'supermarketnews.com', label: 'Supermarket News', city: 'National' },
  { domain: 'nrn.com', label: "Nation's Restaurant News", city: 'National' },
  { domain: 'restaurantbusinessonline.com', label: 'Restaurant Business', city: 'National' },
  { domain: 'civileats.com', label: 'Civil Eats', city: 'National' },
  { domain: 'thecounter.org', label: 'The Counter', city: 'National' },
  { domain: 'modernfarmer.com', label: 'Modern Farmer', city: 'National' },
  { domain: 'progressivegrocer.com', label: 'Progressive Grocer', city: 'National' },

  // === Couverture État par État (quotidien + magazine local food/lifestyle) ===

  // Florida (extension)
  { domain: 'tampabay.com', label: 'Tampa Bay Times', city: 'Tampa, FL' },
  { domain: 'orlandosentinel.com', label: 'Orlando Sentinel', city: 'Orlando, FL' },
  { domain: 'sun-sentinel.com', label: 'South Florida Sun-Sentinel', city: 'Fort Lauderdale, FL' },
  { domain: 'jacksonville.com', label: 'The Florida Times-Union', city: 'Jacksonville, FL' },
  { domain: 'edibleorlando.com', label: 'Edible Orlando', city: 'Orlando, FL' },

  // Nevada
  { domain: 'reviewjournal.com', label: 'Las Vegas Review-Journal', city: 'Las Vegas, NV' },
  { domain: 'lasvegasweekly.com', label: 'Las Vegas Weekly', city: 'Las Vegas, NV' },
  { domain: 'vegas.eater.com', label: 'Eater Vegas', city: 'Las Vegas, NV' },
  { domain: 'rgj.com', label: 'Reno Gazette Journal', city: 'Reno, NV' },

  // Arizona
  { domain: 'azcentral.com', label: 'The Arizona Republic', city: 'Phoenix, AZ' },
  { domain: 'phoenixmag.com', label: 'PHOENIX magazine', city: 'Phoenix, AZ' },
  { domain: 'tucson.com', label: 'Arizona Daily Star', city: 'Tucson, AZ' },
  { domain: 'phoenixnewtimes.com', label: 'Phoenix New Times', city: 'Phoenix, AZ' },

  // New Mexico
  { domain: 'abqjournal.com', label: 'Albuquerque Journal', city: 'Albuquerque, NM' },
  { domain: 'santafenewmexican.com', label: 'The Santa Fe New Mexican', city: 'Santa Fe, NM' },

  // Utah
  { domain: 'sltrib.com', label: 'The Salt Lake Tribune', city: 'Salt Lake City, UT' },
  { domain: 'deseret.com', label: 'Deseret News', city: 'Salt Lake City, UT' },
  { domain: 'saltlakemagazine.com', label: 'Salt Lake Magazine', city: 'Salt Lake City, UT' },

  // Idaho / Montana / Wyoming
  { domain: 'idahostatesman.com', label: 'Idaho Statesman', city: 'Boise, ID' },
  { domain: 'billingsgazette.com', label: 'Billings Gazette', city: 'Billings, MT' },
  { domain: 'jhnewsandguide.com', label: 'Jackson Hole News & Guide', city: 'Jackson, WY' },
  { domain: 'wyomingnews.com', label: 'Wyoming Tribune Eagle', city: 'Cheyenne, WY' },

  // Dakotas / Nebraska / Kansas / Iowa
  { domain: 'bismarcktribune.com', label: 'Bismarck Tribune', city: 'Bismarck, ND' },
  { domain: 'argusleader.com', label: 'Argus Leader', city: 'Sioux Falls, SD' },
  { domain: 'omaha.com', label: 'Omaha World-Herald', city: 'Omaha, NE' },
  { domain: 'kansas.com', label: 'The Wichita Eagle', city: 'Wichita, KS' },
  { domain: 'desmoinesregister.com', label: 'The Des Moines Register', city: 'Des Moines, IA' },

  // Missouri
  { domain: 'stltoday.com', label: 'St. Louis Post-Dispatch', city: 'St. Louis, MO' },
  { domain: 'kansascity.com', label: 'The Kansas City Star', city: 'Kansas City, MO' },
  { domain: 'feastmagazine.com', label: 'Feast Magazine', city: 'St. Louis, MO' },

  // Oklahoma / Arkansas
  { domain: 'oklahoman.com', label: 'The Oklahoman', city: 'Oklahoma City, OK' },
  { domain: 'tulsaworld.com', label: 'Tulsa World', city: 'Tulsa, OK' },
  { domain: 'arkansasonline.com', label: 'Arkansas Democrat-Gazette', city: 'Little Rock, AR' },

  // Louisiana / Mississippi / Alabama
  { domain: 'nola.com', label: 'The Times-Picayune | NOLA.com', city: 'New Orleans, LA' },
  { domain: 'theadvocate.com', label: 'The Advocate', city: 'Baton Rouge, LA' },
  { domain: 'neworleansmagazine.com', label: 'New Orleans Magazine', city: 'New Orleans, LA' },
  { domain: 'clarionledger.com', label: 'The Clarion-Ledger', city: 'Jackson, MS' },
  { domain: 'al.com', label: 'AL.com', city: 'Birmingham, AL' },
  { domain: 'birminghammag.com', label: 'Birmingham Magazine', city: 'Birmingham, AL' },

  // Tennessee
  { domain: 'tennessean.com', label: 'The Tennessean', city: 'Nashville, TN' },
  { domain: 'commercialappeal.com', label: 'The Commercial Appeal', city: 'Memphis, TN' },
  { domain: 'nashvillescene.com', label: 'Nashville Scene', city: 'Nashville, TN' },
  { domain: 'nashville.eater.com', label: 'Eater Nashville', city: 'Nashville, TN' },

  // Kentucky / West Virginia
  { domain: 'courier-journal.com', label: 'The Courier-Journal', city: 'Louisville, KY' },
  { domain: 'kentucky.com', label: 'Lexington Herald-Leader', city: 'Lexington, KY' },
  { domain: 'louisvillemagazine.com', label: 'Louisville Magazine', city: 'Louisville, KY' },
  { domain: 'wvgazettemail.com', label: 'Charleston Gazette-Mail', city: 'Charleston, WV' },

  // North Carolina / South Carolina
  { domain: 'newsobserver.com', label: 'The News & Observer', city: 'Raleigh, NC' },
  { domain: 'charlotteobserver.com', label: 'The Charlotte Observer', city: 'Charlotte, NC' },
  { domain: 'ourstate.com', label: 'Our State', city: 'North Carolina' },
  { domain: 'charlottemagazine.com', label: 'Charlotte Magazine', city: 'Charlotte, NC' },
  { domain: 'charlotte.eater.com', label: 'Eater Carolinas', city: 'Charlotte, NC' },
  { domain: 'thestate.com', label: 'The State', city: 'Columbia, SC' },
  { domain: 'postandcourier.com', label: 'The Post and Courier', city: 'Charleston, SC' },
  { domain: 'charlestonmag.com', label: 'Charleston Magazine', city: 'Charleston, SC' },

  // Virginia / Maryland / Delaware
  { domain: 'richmond.com', label: 'Richmond Times-Dispatch', city: 'Richmond, VA' },
  { domain: 'pilotonline.com', label: 'The Virginian-Pilot', city: 'Norfolk, VA' },
  { domain: 'baltimoresun.com', label: 'The Baltimore Sun', city: 'Baltimore, MD' },
  { domain: 'baltimoremagazine.com', label: 'Baltimore Magazine', city: 'Baltimore, MD' },
  { domain: 'delawareonline.com', label: 'The News Journal', city: 'Wilmington, DE' },

  // New Jersey / Connecticut / Rhode Island
  { domain: 'nj.com', label: 'NJ.com', city: 'New Jersey' },
  { domain: 'northjersey.com', label: 'The Record', city: 'Bergen County, NJ' },
  { domain: 'courant.com', label: 'Hartford Courant', city: 'Hartford, CT' },
  { domain: 'ctpost.com', label: 'Connecticut Post', city: 'Bridgeport, CT' },
  { domain: 'ctinsider.com', label: 'CT Insider', city: 'Connecticut' },
  { domain: 'providencejournal.com', label: 'The Providence Journal', city: 'Providence, RI' },
  { domain: 'rimonthly.com', label: 'Rhode Island Monthly', city: 'Providence, RI' },

  // New England (Vermont, NH, Maine)
  { domain: 'burlingtonfreepress.com', label: 'Burlington Free Press', city: 'Burlington, VT' },
  { domain: 'sevendaysvt.com', label: 'Seven Days', city: 'Burlington, VT' },
  { domain: 'unionleader.com', label: 'New Hampshire Union Leader', city: 'Manchester, NH' },
  { domain: 'pressherald.com', label: 'Portland Press Herald', city: 'Portland, ME' },

  // Ohio
  { domain: 'cleveland.com', label: 'Cleveland.com / The Plain Dealer', city: 'Cleveland, OH' },
  { domain: 'dispatch.com', label: 'The Columbus Dispatch', city: 'Columbus, OH' },
  { domain: 'enquirer.com', label: 'The Cincinnati Enquirer', city: 'Cincinnati, OH' },
  { domain: 'clevelandmagazine.com', label: 'Cleveland Magazine', city: 'Cleveland, OH' },
  { domain: 'cincinnatimagazine.com', label: 'Cincinnati Magazine', city: 'Cincinnati, OH' },
  { domain: 'columbusmonthly.com', label: 'Columbus Monthly', city: 'Columbus, OH' },

  // Michigan
  { domain: 'freep.com', label: 'Detroit Free Press', city: 'Detroit, MI' },
  { domain: 'detroitnews.com', label: 'The Detroit News', city: 'Detroit, MI' },
  { domain: 'mlive.com', label: 'MLive', city: 'Michigan' },
  { domain: 'hourdetroit.com', label: 'Hour Detroit', city: 'Detroit, MI' },
  { domain: 'detroit.eater.com', label: 'Eater Detroit', city: 'Detroit, MI' },

  // Indiana
  { domain: 'indystar.com', label: 'The Indianapolis Star', city: 'Indianapolis, IN' },
  { domain: 'indianapolismonthly.com', label: 'Indianapolis Monthly', city: 'Indianapolis, IN' },

  // Wisconsin / Minnesota
  { domain: 'jsonline.com', label: 'Milwaukee Journal Sentinel', city: 'Milwaukee, WI' },
  { domain: 'milwaukeemag.com', label: 'Milwaukee Magazine', city: 'Milwaukee, WI' },
  { domain: 'madisonmagazine.com', label: 'Madison Magazine', city: 'Madison, WI' },
  { domain: 'startribune.com', label: 'Star Tribune', city: 'Minneapolis, MN' },
  { domain: 'mspmag.com', label: 'Mpls.St.Paul Magazine', city: 'Minneapolis, MN' },
  { domain: 'twincities.eater.com', label: 'Eater Twin Cities', city: 'Minneapolis, MN' },

  // Texas extension
  { domain: 'expressnews.com', label: 'San Antonio Express-News', city: 'San Antonio, TX' },
  { domain: 'star-telegram.com', label: 'Fort Worth Star-Telegram', city: 'Fort Worth, TX' },
  { domain: 'houston.eater.com', label: 'Eater Houston', city: 'Houston, TX' },
  { domain: 'dallas.eater.com', label: 'Eater Dallas', city: 'Dallas, TX' },

  // California extension (San Diego, Sacramento, Bay Area extension)
  { domain: 'sandiegouniontribune.com', label: 'The San Diego Union-Tribune', city: 'San Diego, CA' },
  { domain: 'sdmag.com', label: 'San Diego Magazine', city: 'San Diego, CA' },
  { domain: 'sandiego.eater.com', label: 'Eater San Diego', city: 'San Diego, CA' },
  { domain: 'sacbee.com', label: 'The Sacramento Bee', city: 'Sacramento, CA' },
  { domain: 'mercurynews.com', label: 'The Mercury News', city: 'San Jose, CA' },

  // Hawaii / Alaska
  { domain: 'staradvertiser.com', label: 'Honolulu Star-Advertiser', city: 'Honolulu, HI' },
  { domain: 'honolulumagazine.com', label: 'Honolulu Magazine', city: 'Honolulu, HI' },
  { domain: 'adn.com', label: 'Anchorage Daily News', city: 'Anchorage, AK' },

  // ════════════════════════════════════════════════════════════════
  // EXPANSION 2026 — TV networks, digital media, trade press, radio
  // ════════════════════════════════════════════════════════════════

  // === Cable / national TV news ===
  { domain: 'msnbc.com', label: 'MSNBC', city: 'New York' },
  { domain: 'foxnews.com', label: 'Fox News', city: 'New York' },
  { domain: 'foxbusiness.com', label: 'Fox Business', city: 'New York' },
  { domain: 'cnbc.com', label: 'CNBC', city: 'Englewood Cliffs NJ' },
  { domain: 'bloomberg.com', label: 'Bloomberg', city: 'New York' },
  { domain: 'newsnationnow.com', label: 'NewsNation', city: 'Chicago' },
  { domain: 'scrippsnews.com', label: 'Scripps News', city: 'National' },
  { domain: 'pbs.org', label: 'PBS NewsHour', city: 'Arlington VA' },
  { domain: 'newsmax.com', label: 'Newsmax', city: 'Boca Raton FL' },

  // === Top local TV stations (Top 30 DMA) — ABC affiliates ===
  { domain: 'abc7.com', label: 'KABC-TV (ABC LA)', city: 'Los Angeles' },
  { domain: 'abc7ny.com', label: 'WABC-TV (ABC NY)', city: 'New York' },
  { domain: 'abc7chicago.com', label: 'WLS-TV (ABC Chicago)', city: 'Chicago' },
  { domain: '6abc.com', label: 'WPVI-TV (ABC Philly)', city: 'Philadelphia' },
  { domain: 'abc13.com', label: 'KTRK-TV (ABC Houston)', city: 'Houston' },
  { domain: 'abc7news.com', label: 'KGO-TV (ABC SF Bay)', city: 'San Francisco' },
  { domain: 'wfaa.com', label: 'WFAA (ABC Dallas)', city: 'Dallas' },
  { domain: 'wsbtv.com', label: 'WSB-TV (ABC Atlanta)', city: 'Atlanta' },
  { domain: 'wxyz.com', label: 'WXYZ (ABC Detroit)', city: 'Detroit' },
  { domain: 'wftv.com', label: 'WFTV (ABC Orlando)', city: 'Orlando' },
  { domain: 'wcvb.com', label: 'WCVB (ABC Boston)', city: 'Boston' },
  { domain: 'wjla.com', label: 'WJLA (ABC DC)', city: 'Washington DC' },
  { domain: 'localsyr.com', label: 'WSYR (ABC Syracuse)', city: 'Syracuse' },
  { domain: 'kgun9.com', label: 'KGUN (ABC Tucson)', city: 'Tucson' },
  { domain: 'abc15.com', label: 'KNXV (ABC Phoenix)', city: 'Phoenix' },

  // === CBS affiliates ===
  { domain: 'cbsnews.com/losangeles', label: 'KCBS-TV (CBS LA)', city: 'Los Angeles' },
  { domain: 'cbsnews.com/newyork', label: 'WCBS-TV (CBS NY)', city: 'New York' },
  { domain: 'cbsnews.com/chicago', label: 'WBBM-TV (CBS Chicago)', city: 'Chicago' },
  { domain: 'cbsnews.com/philadelphia', label: 'KYW-TV (CBS Philly)', city: 'Philadelphia' },
  { domain: 'cbsnews.com/boston', label: 'WBZ (CBS Boston)', city: 'Boston' },
  { domain: 'cbsnews.com/sanfrancisco', label: 'KPIX (CBS SF)', city: 'San Francisco' },
  { domain: 'cbsnews.com/miami', label: 'WFOR (CBS Miami)', city: 'Miami' },
  { domain: 'cbsnews.com/baltimore', label: 'WJZ (CBS Baltimore)', city: 'Baltimore' },
  { domain: 'cbsnews.com/minnesota', label: 'WCCO (CBS Minneapolis)', city: 'Minneapolis' },
  { domain: 'cbsnews.com/sacramento', label: 'KOVR (CBS Sacramento)', city: 'Sacramento' },
  { domain: 'cbsnews.com/colorado', label: 'KCNC (CBS Denver)', city: 'Denver' },
  { domain: 'cbsnews.com/pittsburgh', label: 'KDKA (CBS Pittsburgh)', city: 'Pittsburgh' },
  { domain: 'khou.com', label: 'KHOU (CBS Houston)', city: 'Houston' },
  { domain: 'wtsp.com', label: 'WTSP (CBS Tampa)', city: 'Tampa' },
  { domain: 'wral.com', label: 'WRAL (CBS Raleigh)', city: 'Raleigh' },

  // === NBC affiliates ===
  { domain: 'nbcnewyork.com', label: 'WNBC (NBC NY)', city: 'New York' },
  { domain: 'nbclosangeles.com', label: 'KNBC (NBC LA)', city: 'Los Angeles' },
  { domain: 'nbcchicago.com', label: 'WMAQ (NBC Chicago)', city: 'Chicago' },
  { domain: 'nbcbayarea.com', label: 'KNTV (NBC SF Bay)', city: 'San Francisco' },
  { domain: 'nbcphiladelphia.com', label: 'WCAU (NBC Philly)', city: 'Philadelphia' },
  { domain: 'nbcboston.com', label: 'WBTS (NBC Boston)', city: 'Boston' },
  { domain: 'nbcwashington.com', label: 'WRC (NBC DC)', city: 'Washington DC' },
  { domain: 'nbcsandiego.com', label: 'KNSD (NBC San Diego)', city: 'San Diego' },
  { domain: 'nbcconnecticut.com', label: 'WVIT (NBC Connecticut)', city: 'Hartford' },
  { domain: 'nbcdfw.com', label: 'KXAS (NBC Dallas)', city: 'Dallas' },
  { domain: 'nbcmiami.com', label: 'WTVJ (NBC Miami)', city: 'Miami' },
  { domain: 'click2houston.com', label: 'KPRC (NBC Houston)', city: 'Houston' },
  { domain: 'kxan.com', label: 'KXAN (NBC Austin)', city: 'Austin' },
  { domain: 'king5.com', label: 'KING-TV (NBC Seattle)', city: 'Seattle' },
  { domain: 'kare11.com', label: 'KARE (NBC Minneapolis)', city: 'Minneapolis' },

  // === Fox affiliates ===
  { domain: 'fox5ny.com', label: 'WNYW (Fox NY)', city: 'New York' },
  { domain: 'foxla.com', label: 'KTTV (Fox LA)', city: 'Los Angeles' },
  { domain: 'fox32chicago.com', label: 'WFLD (Fox Chicago)', city: 'Chicago' },
  { domain: 'fox5dc.com', label: 'WTTG (Fox DC)', city: 'Washington DC' },
  { domain: 'fox26houston.com', label: 'KRIV (Fox Houston)', city: 'Houston' },
  { domain: 'wsvn.com', label: 'WSVN (Fox Miami)', city: 'Miami' },
  { domain: 'fox5atlanta.com', label: 'WAGA (Fox Atlanta)', city: 'Atlanta' },
  { domain: 'fox4news.com', label: 'KDFW (Fox Dallas)', city: 'Dallas' },
  { domain: 'fox29.com', label: 'WTXF (Fox Philly)', city: 'Philadelphia' },
  { domain: 'fox13news.com', label: 'WTVT (Fox Tampa)', city: 'Tampa' },
  { domain: 'q13fox.com', label: 'KCPQ (Fox Seattle)', city: 'Seattle' },
  { domain: 'fox2detroit.com', label: 'WJBK (Fox Detroit)', city: 'Detroit' },
  { domain: 'fox9.com', label: 'KMSP (Fox Minneapolis)', city: 'Minneapolis' },
  { domain: 'fox35orlando.com', label: 'WOFL (Fox Orlando)', city: 'Orlando' },

  // === National digital media ===
  { domain: 'vice.com', label: 'Vice', city: 'New York' },
  { domain: 'vox.com', label: 'Vox', city: 'New York' },
  { domain: 'businessinsider.com', label: 'Business Insider', city: 'New York' },
  { domain: 'thedailybeast.com', label: 'The Daily Beast', city: 'New York' },
  { domain: 'salon.com', label: 'Salon', city: 'New York' },
  { domain: 'slate.com', label: 'Slate', city: 'New York' },
  { domain: 'theatlantic.com', label: 'The Atlantic', city: 'Washington DC' },
  { domain: 'buzzfeednews.com', label: 'BuzzFeed News', city: 'New York' },
  { domain: 'mashable.com', label: 'Mashable', city: 'New York' },
  { domain: 'huffpost.com', label: 'HuffPost', city: 'New York' },
  { domain: 'thehill.com', label: 'The Hill', city: 'Washington DC' },
  { domain: 'newsweek.com', label: 'Newsweek', city: 'New York' },
  { domain: 'time.com', label: 'TIME', city: 'New York' },
  { domain: 'usnews.com', label: 'US News & World Report', city: 'Washington DC' },
  { domain: 'reuters.com', label: 'Reuters', city: 'New York' },
  { domain: 'apnews.com', label: 'Associated Press', city: 'New York' },
  { domain: 'forbes.com', label: 'Forbes', city: 'New York' },
  { domain: 'fortune.com', label: 'Fortune', city: 'New York' },
  { domain: 'fastcompany.com', label: 'Fast Company', city: 'New York' },
  { domain: 'inc.com', label: 'Inc.', city: 'New York' },
  { domain: 'entrepreneur.com', label: 'Entrepreneur', city: 'Irvine CA' },
  { domain: 'theverge.com', label: 'The Verge', city: 'New York' },
  { domain: 'wired.com', label: 'Wired', city: 'San Francisco' },
  { domain: 'engadget.com', label: 'Engadget', city: 'New York' },
  { domain: 'techcrunch.com', label: 'TechCrunch', city: 'San Francisco' },
  { domain: 'gizmodo.com', label: 'Gizmodo', city: 'New York' },
  { domain: 'arstechnica.com', label: 'Ars Technica', city: 'New York' },
  { domain: 'protocol.com', label: 'Protocol', city: 'San Francisco' },
  { domain: 'theinformation.com', label: 'The Information', city: 'San Francisco' },
  { domain: 'axios.com', label: 'Axios', city: 'Arlington VA' },
  { domain: 'semafor.com', label: 'Semafor', city: 'New York' },
  { domain: 'punchbowl.news', label: 'Punchbowl News', city: 'Washington DC' },

  // === Lifestyle / women's interest / food ===
  { domain: 'refinery29.com', label: 'Refinery29', city: 'New York' },
  { domain: 'purewow.com', label: 'PureWow', city: 'New York' },
  { domain: 'thespruceeats.com', label: 'The Spruce Eats', city: 'New York' },
  { domain: 'thespruce.com', label: 'The Spruce', city: 'New York' },
  { domain: 'allrecipes.com', label: 'Allrecipes', city: 'Seattle' },
  { domain: 'food52.com', label: 'Food52', city: 'New York' },
  { domain: 'thedailymeal.com', label: 'The Daily Meal', city: 'New York' },
  { domain: 'saveur.com', label: 'Saveur', city: 'New York' },
  { domain: 'myrecipes.com', label: 'MyRecipes', city: 'Birmingham AL' },
  { domain: 'eatingwell.com', label: 'EatingWell', city: 'Shelburne VT' },
  { domain: 'cookinglight.com', label: 'Cooking Light', city: 'Birmingham AL' },
  { domain: 'realsimple.com', label: 'Real Simple', city: 'New York' },
  { domain: 'southernliving.com', label: 'Southern Living', city: 'Birmingham AL' },
  { domain: 'goodhousekeeping.com', label: 'Good Housekeeping', city: 'New York' },
  { domain: 'marthastewart.com', label: 'Martha Stewart', city: 'New York' },
  { domain: 'apartmenttherapy.com', label: 'Apartment Therapy', city: 'New York' },
  { domain: 'parade.com', label: 'Parade', city: 'New York' },
  { domain: 'tastecooking.com', label: 'Taste', city: 'New York' },
  { domain: 'oprah.com', label: 'Oprah Daily', city: 'New York' },
  { domain: 'mensjournal.com', label: "Men's Journal", city: 'New York' },
  { domain: 'outsideonline.com', label: 'Outside', city: 'Santa Fe' },
  { domain: 'runnersworld.com', label: "Runner's World", city: 'New York' },
  { domain: 'bicycling.com', label: 'Bicycling', city: 'New York' },
  { domain: 'cosmopolitan.com', label: 'Cosmopolitan', city: 'New York' },
  { domain: 'elle.com', label: 'Elle', city: 'New York' },
  { domain: 'harpersbazaar.com', label: "Harper's Bazaar", city: 'New York' },
  { domain: 'instyle.com', label: 'InStyle', city: 'New York' },
  { domain: 'glamour.com', label: 'Glamour', city: 'New York' },
  { domain: 'allure.com', label: 'Allure', city: 'New York' },
  { domain: 'vogue.com', label: 'Vogue', city: 'New York' },
  { domain: 'gq.com', label: 'GQ', city: 'New York' },
  { domain: 'vanityfair.com', label: 'Vanity Fair', city: 'New York' },

  // === Trade press supplémentaires ===
  { domain: 'qsrmagazine.com', label: 'QSR Magazine', city: 'Durham NC' },
  { domain: 'restaurant-hospitality.com', label: 'Restaurant Hospitality', city: 'Cleveland' },
  { domain: 'fsrmagazine.com', label: 'FSR Magazine', city: 'Durham NC' },
  { domain: 'hotelmanagement.net', label: 'Hotel Management', city: 'New York' },
  { domain: 'hotelnewsnow.com', label: 'Hotel News Now', city: 'Cleveland' },
  { domain: 'hospitalitynet.org', label: 'Hospitality Net', city: 'National' },
  { domain: 'grocerydive.com', label: 'Grocery Dive', city: 'Washington DC' },
  { domain: 'retaildive.com', label: 'Retail Dive', city: 'Washington DC' },
  { domain: 'csnews.com', label: 'Convenience Store News', city: 'New York' },
  { domain: 'cspdailynews.com', label: 'CSP Daily News', city: 'Chicago' },
  { domain: 'beverageindustry.com', label: 'Beverage Industry', city: 'Troy MI' },
  { domain: 'beveragedaily.com', label: 'Beverage Daily', city: 'New York' },
  { domain: 'wineindustryadvisor.com', label: 'Wine Industry Advisor', city: 'Sonoma CA' },
  { domain: 'foodengineeringmag.com', label: 'Food Engineering', city: 'Troy MI' },
  { domain: 'foodprocessing.com', label: 'Food Processing', city: 'Itasca IL' },
  { domain: 'preparedfoods.com', label: 'Prepared Foods', city: 'Chicago' },
  { domain: 'meatpoultry.com', label: 'Meat+Poultry', city: 'Kansas City' },
  { domain: 'naturalproductsinsider.com', label: 'Natural Products Insider', city: 'National' },
  { domain: 'newhope.com', label: 'New Hope Network', city: 'Boulder' },
  { domain: 'bakingbusiness.com', label: 'Baking Business', city: 'Kansas City' },
  { domain: 'foodmanufacturing.com', label: 'Food Manufacturing', city: 'Madison WI' },
  { domain: 'snackandbakery.com', label: 'Snack and Bakery', city: 'Troy MI' },
  { domain: 'dairyfoods.com', label: 'Dairy Foods', city: 'Troy MI' },
  { domain: 'foodlogistics.com', label: 'Food Logistics', city: 'Fort Atkinson WI' },
  { domain: 'progressivegrocer.com', label: 'Progressive Grocer', city: 'New York' },
  { domain: 'winsightgrocerybusiness.com', label: 'Winsight Grocery Business', city: 'Chicago' },

  // === Health / medical media ===
  { domain: 'medpagetoday.com', label: 'MedPage Today', city: 'New York' },
  { domain: 'statnews.com', label: 'STAT News', city: 'Boston' },
  { domain: 'fiercepharma.com', label: 'Fierce Pharma', city: 'Newton MA' },
  { domain: 'fiercehealthcare.com', label: 'Fierce Healthcare', city: 'Newton MA' },
  { domain: 'kffhealthnews.org', label: 'KFF Health News', city: 'San Francisco' },
  { domain: 'medscape.com', label: 'Medscape', city: 'New York' },
  { domain: 'healthcaredive.com', label: 'Healthcare Dive', city: 'Washington DC' },
  { domain: 'modernhealthcare.com', label: 'Modern Healthcare', city: 'Chicago' },
  { domain: 'beckershospitalreview.com', label: "Becker's Hospital Review", city: 'Chicago' },

  // === Radio / podcast / public media ===
  { domain: 'iheart.com', label: 'iHeartMedia', city: 'San Antonio' },
  { domain: 'audacy.com', label: 'Audacy', city: 'Philadelphia' },
  { domain: 'wnyc.org', label: 'WNYC', city: 'New York' },
  { domain: 'kqed.org', label: 'KQED', city: 'San Francisco' },
  { domain: 'wbez.org', label: 'WBEZ Chicago', city: 'Chicago' },
  { domain: 'wbur.org', label: 'WBUR Boston', city: 'Boston' },
  { domain: 'mprnews.org', label: 'MPR News', city: 'St Paul' },
  { domain: 'wamu.org', label: 'WAMU', city: 'Washington DC' },
  { domain: 'kpcc.org', label: 'KPCC / LAist Studios', city: 'Pasadena' },
  { domain: 'wabe.org', label: 'WABE Atlanta', city: 'Atlanta' },
  { domain: 'kut.org', label: 'KUT Austin', city: 'Austin' },
  { domain: 'wesa.fm', label: 'WESA Pittsburgh', city: 'Pittsburgh' },
  { domain: 'kuow.org', label: 'KUOW Seattle', city: 'Seattle' },
  { domain: 'kera.org', label: 'KERA Dallas', city: 'Dallas' },
  { domain: 'wlrn.org', label: 'WLRN Miami', city: 'Miami' },
  { domain: 'mprmarketplace.org', label: 'Marketplace (APM)', city: 'Los Angeles' },
  { domain: 'thisamericanlife.org', label: 'This American Life', city: 'Chicago' },
  { domain: 'gimletmedia.com', label: 'Gimlet Media', city: 'New York' },

  // === Independent food / niche ===
  { domain: 'edibleboston.com', label: 'Edible Boston', city: 'Boston' },
  { domain: 'edible-manhattan.com', label: 'Edible Manhattan', city: 'New York' },
  { domain: 'ediblebrooklyn.com', label: 'Edible Brooklyn', city: 'New York' },
  { domain: 'edibleeastend.com', label: 'Edible East End', city: 'Long Island' },
  { domain: 'ediblesf.com', label: 'Edible San Francisco', city: 'San Francisco' },
  { domain: 'ediblela.com', label: 'Edible Los Angeles', city: 'Los Angeles' },
  { domain: 'cherrybombe.com', label: 'Cherry Bombe', city: 'New York' },
  { domain: 'whetstonemagazine.com', label: 'Whetstone Magazine', city: 'New York' },
  { domain: 'foodtank.com', label: 'Food Tank', city: 'Washington DC' },
  { domain: 'gastronomica.org', label: 'Gastronomica', city: 'Berkeley' },
  { domain: 'lemonadeday.org', label: 'Lemonade Day', city: 'Houston' },
  { domain: 'craftedmag.com', label: 'Crafted Magazine', city: 'National' },
  { domain: 'plantbasednews.org', label: 'Plant Based News', city: 'National' },
  { domain: 'vegnews.com', label: 'VegNews', city: 'San Francisco' }
];

// Chemins fréquents pour pages staff/contact (avec et sans slash final)
const CANDIDATE_PATHS = [
  '/', '/staff', '/staff/', '/about', '/about/', '/about-us', '/about-us/',
  '/about/staff', '/about/staff/', '/contact', '/contact/', '/contact-us', '/contact-us/',
  '/team', '/team/', '/our-team', '/our-team/', '/people', '/people/',
  '/masthead', '/masthead/', '/editorial', '/editorial/',
  '/editorial-team', '/editorial-team/', '/who-we-are', '/who-we-are/',
  '/authors', '/authors/', '/contributors', '/contributors/',
  '/newsroom', '/newsroom/', '/press', '/press/', '/tips', '/tips/',
  '/about/contact', '/about/contact/', '/about/our-team', '/about/our-team/'
];

// Domaines parents (groupes médias) — beaucoup de journalistes utilisent
// ces domaines plutôt que celui du site lui-même.
const MEDIA_PARENT_DOMAINS = {
  // Vox Media
  'eater.com': ['voxmedia.com'],
  'la.eater.com': ['voxmedia.com', 'eater.com'],
  'chicago.eater.com': ['voxmedia.com', 'eater.com'],
  'sf.eater.com': ['voxmedia.com', 'eater.com'],
  'boston.eater.com': ['voxmedia.com', 'eater.com'],
  'miami.eater.com': ['voxmedia.com', 'eater.com'],
  'austin.eater.com': ['voxmedia.com', 'eater.com'],
  'seattle.eater.com': ['voxmedia.com', 'eater.com'],
  'pdx.eater.com': ['voxmedia.com', 'eater.com'],
  'atlanta.eater.com': ['voxmedia.com', 'eater.com'],
  'denver.eater.com': ['voxmedia.com', 'eater.com'],
  'philly.eater.com': ['voxmedia.com', 'eater.com'],
  'dc.eater.com': ['voxmedia.com', 'eater.com'],
  'nymag.com': ['voxmedia.com'],
  // Condé Nast
  'bonappetit.com': ['condenast.com'],
  'epicurious.com': ['condenast.com'],
  'newyorker.com': ['condenast.com'],
  'self.com': ['condenast.com'],
  // Hearst
  'menshealth.com': ['hearst.com'],
  'womenshealthmag.com': ['hearst.com'],
  'prevention.com': ['hearst.com'],
  'delish.com': ['hearst.com'],
  // Dotdash Meredith
  'foodandwine.com': ['dotdash.com', 'dotdashmdp.com', 'meredith.com'],
  'health.com': ['dotdash.com', 'dotdashmdp.com', 'meredith.com'],
  'shape.com': ['dotdash.com', 'dotdashmdp.com', 'meredith.com'],
  'verywellhealth.com': ['dotdash.com', 'dotdashmdp.com'],
  'byrdie.com': ['dotdash.com', 'dotdashmdp.com'],
  'thespruceeats.com': ['dotdash.com', 'dotdashmdp.com'],
  'seriouseats.com': ['dotdash.com', 'dotdashmdp.com'],
  // RedVentures
  'healthline.com': ['redventures.com'],
  // Vox Media also for The Verge etc but pas pertinent ici
};

function getAcceptedDomainsForTarget(domain) {
  const out = new Set([domain]);
  // www variant
  if (!domain.startsWith('www.')) out.add(`www.${domain}`);
  // Parents connus
  const parents = MEDIA_PARENT_DOMAINS[domain] || [];
  for (const p of parents) out.add(p);
  return Array.from(out);
}

const STAFF_LINK_KEYWORDS = [
  'staff', 'about', 'team', 'contact', 'masthead', 'editorial',
  'people', 'authors', 'contributors', 'newsroom', 'press',
  'who-we-are', 'who we are', 'our team', 'meet the'
];

const GENERIC_LOCAL_PARTS = new Set([
  'info', 'contact', 'support', 'help', 'webmaster', 'admin',
  'noreply', 'no-reply', 'donotreply', 'subscriptions', 'subscribe',
  'unsubscribe', 'privacy', 'legal', 'sales', 'marketing', 'jobs',
  'careers', 'hr', 'media', 'advertising', 'ads', 'feedback',
  'comments', 'corrections', 'letters', 'general', 'hello',
  'mail', 'email', 'office', 'reception'
]);

// Generic emails utiles pour outreach presse, on les garde mais on tag
const PRESS_GENERIC = new Set([
  'tips', 'tip', 'pitch', 'pitches', 'editor', 'editors', 'news',
  'newsroom', 'press', 'releases', 'pressreleases', 'media',
  'newsdesk', 'desk', 'food', 'lifestyle', 'health', 'wellness'
]);

const REQUEST_TIMEOUT_MS = 12000;
const SLEEP_BETWEEN_REQUESTS_MS = 800;
const MAX_REDIRECTS = 5;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const HUNTER_CSV = path.join(__dirname, 'output', 'media-contacts.csv');
const OUTPUT_CSV = path.join(__dirname, 'output', 'media-contacts-scraped.csv');

// --- HTTP fetch avec redirects et timeout -------------------------------

function isChallengePage(body) {
  if (!body) return false;
  if (body.length < 3000 && /sgcaptcha|cf-browser-verification|cf_chl_|just a moment|cloudflare|captcha|enable javascript and cookies/i.test(body)) {
    return true;
  }
  // Cloudflare interstitial parfois plus verbeuse mais reconnaissable
  if (/<title>\s*just a moment\.\.\.\s*<\/title>/i.test(body)) return true;
  return false;
}

function fetchUrl(targetUrl, redirects = 0) {
  return new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(targetUrl); }
    catch { return resolve({ ok: false, reason: 'invalid url' }); }

    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.get({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'http:' ? 80 : 443),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: REQUEST_TIMEOUT_MS
    }, (res) => {
      // Redirections
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const loc = res.headers.location;
        res.resume();
        if (!loc || redirects >= MAX_REDIRECTS) {
          return resolve({ ok: false, reason: 'too many redirects' });
        }
        const next = loc.startsWith('http') ? loc : new URL(loc, targetUrl).toString();
        return resolve(fetchUrl(next, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve({ ok: false, reason: `HTTP ${res.statusCode}` });
      }
      const ctype = (res.headers['content-type'] || '').toLowerCase();
      if (ctype && !ctype.includes('html') && !ctype.includes('text/plain') && !ctype.includes('xml')) {
        res.resume();
        return resolve({ ok: false, reason: `non-html (${ctype})` });
      }

      // Décompression selon Content-Encoding
      const encoding = (res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress());

      const chunks = [];
      let bytes = 0;
      const MAX_BYTES = 4_000_000;
      stream.on('data', (chunk) => {
        chunks.push(chunk);
        bytes += chunk.length;
        if (bytes > MAX_BYTES) {
          req.destroy();
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ ok: true, body, finalUrl: targetUrl, truncated: true });
        }
      });
      stream.on('error', (err) => resolve({ ok: false, reason: `decompress: ${err.message}` }));
      stream.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (isChallengePage(body)) {
          return resolve({ ok: false, reason: 'cloudflare/captcha challenge' });
        }
        resolve({ ok: true, body, finalUrl: targetUrl });
      });
    });
    req.on('error', (err) => resolve({ ok: false, reason: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
  });
}

// --- Playwright fallback (pour Cloudflare / SGCaptcha / JS-rendered) ----

let _browser = null;
async function getBrowser() {
  if (_browser) return _browser;
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (err) {
    log(`[!] Playwright non installé : npm install -D playwright`, 'red');
    throw err;
  }
  _browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  return _browser;
}

async function closeBrowser() {
  if (_browser) {
    try { await _browser.close(); } catch {}
    _browser = null;
  }
}

async function fetchUrlWithBrowser(targetUrl) {
  let ctx;
  try {
    const browser = await getBrowser();
    ctx = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // @ts-ignore
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      // Laisse Cloudflare résoudre le challenge si présent
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const body = await page.content();
      const finalUrl = page.url();
      if (isChallengePage(body)) {
        return { ok: false, reason: 'still blocked after browser' };
      }
      return { ok: true, body, finalUrl };
    } catch (err) {
      return { ok: false, reason: `playwright: ${err.message}` };
    }
  } catch (err) {
    return { ok: false, reason: `playwright init: ${err.message}` };
  } finally {
    if (ctx) try { await ctx.close(); } catch {}
  }
}

function shouldFallbackToBrowser(reason) {
  if (!reason) return false;
  return /cloudflare|captcha|HTTP 202|HTTP 403|HTTP 503|HTTP 429|HTTP 451/i.test(reason);
}

// --- Email extraction ---------------------------------------------------

function decodeObfuscations(text) {
  // name [at] domain [dot] com → name@domain.com
  return text
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s+at\s+(?=[a-z0-9.-]+\.[a-z]{2,})/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*dot\s*\)\s*/gi, '.')
    .replace(/\s+dot\s+/gi, '.');
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function extractEmailsForDomains(html, acceptedDomains) {
  const found = new Set();
  // Regex globale pour tous les emails, on filtre ensuite par domaine accepté
  const allEmailRe = /([a-zA-Z0-9._+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})/gi;
  const acceptSet = new Set(acceptedDomains.map((d) => d.toLowerCase()));

  // Étape 1 : mailto links dans le HTML brut
  const mailtoRe = /mailto:([a-zA-Z0-9._+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})/gi;
  let m;
  while ((m = mailtoRe.exec(html)) !== null) {
    const email = m[1].toLowerCase();
    const dom = email.split('@')[1];
    if (matchesAcceptedDomain(dom, acceptSet)) found.add(email);
  }

  // Étape 2 : texte clean + déobfuscation
  const text = decodeObfuscations(stripHtml(html));
  while ((m = allEmailRe.exec(text)) !== null) {
    const email = m[1].toLowerCase();
    const dom = email.split('@')[1];
    if (matchesAcceptedDomain(dom, acceptSet)) found.add(email);
  }
  return Array.from(found);
}

function matchesAcceptedDomain(emailDomain, acceptSet) {
  if (!emailDomain) return false;
  if (acceptSet.has(emailDomain)) return true;
  // Matche aussi les sous-domaines (ex: news.foo.com pour foo.com)
  for (const accepted of acceptSet) {
    if (emailDomain.endsWith('.' + accepted)) return true;
  }
  return false;
}

function extractContextForEmail(html, email) {
  // Cherche du texte autour de l'email (300 chars avant / après le mailto ou la mention)
  const idx = html.toLowerCase().indexOf(email.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, idx - 400);
  const end = Math.min(html.length, idx + email.length + 400);
  const snippet = stripHtml(html.slice(start, end)).replace(/\s+/g, ' ').trim();
  return snippet;
}

function guessNameFromLocal(localPart) {
  // John.Doe → John Doe ; jdoe → ?, John ; john_doe → John Doe
  const lp = localPart.toLowerCase().replace(/\d+$/, '');
  let parts = lp.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    const first = capitalize(parts[0]);
    const last = capitalize(parts[parts.length - 1]);
    return { first, last };
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return { first: capitalize(parts[0]), last: '' };
  }
  return { first: '', last: '' };
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

function classifyEmail(email) {
  const local = email.split('@')[0].toLowerCase();
  if (PRESS_GENERIC.has(local)) return 'press_generic';
  if (GENERIC_LOCAL_PARTS.has(local)) return 'generic';
  if (/^[a-z]+\.[a-z]+/.test(local)) return 'personal';      // john.doe
  if (/^[a-z][a-z]+$/.test(local) && local.length >= 4) return 'maybe_personal';
  if (/^[a-z]+_[a-z]+/.test(local)) return 'personal';        // john_doe
  return 'unknown';
}

// --- Discover staff/about pages from a homepage --------------------------

function findStaffLinks(html, baseDomain) {
  const links = new Set();
  const linkRe = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    const anchorText = stripHtml(m[2]).toLowerCase().trim();
    const anchorAndHref = (anchorText + ' ' + href).toLowerCase();
    if (!STAFF_LINK_KEYWORDS.some((k) => anchorAndHref.includes(k))) continue;

    let url;
    try {
      url = new URL(href, `https://${baseDomain}`).toString();
    } catch { continue; }
    if (!url.includes(baseDomain)) continue;
    // Évite ancres + paramètres bizarres
    url = url.split('#')[0];
    if (url.length > 250) continue;
    links.add(url);
  }
  return Array.from(links).slice(0, 8); // cap par site
}

// --- CSV utils -----------------------------------------------------------

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"' && content[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function loadHunterEmails(csvPath) {
  const set = new Set();
  if (!fs.existsSync(csvPath)) {
    log(`[!] ${csvPath} introuvable — pas de déduplication`, 'yellow');
    return set;
  }
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  if (rows.length === 0) return set;
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const iEmail = header.indexOf('email');
  if (iEmail === -1) return set;
  for (let r = 1; r < rows.length; r++) {
    const e = (rows[r][iEmail] || '').toLowerCase().trim();
    if (e) set.add(e);
  }
  log(`Hunter chargé : ${set.size} emails à exclure`, 'gray');
  return set;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// --- Per-domain crawl ---------------------------------------------------

// Quand on est en mode browser, on réduit la liste de chemins pour ne pas
// passer 5 minutes par site (chaque page navigateur = 5-15s).
const BROWSER_PATHS = [
  '/about/', '/about', '/staff/', '/staff', '/contact/', '/contact',
  '/team/', '/team', '/masthead', '/about-us/'
];

async function crawlDomain(target, hunterEmails) {
  const found = new Map();
  const visited = new Set();

  // Priorité 1 : homepage en natif (rapide)
  let home = await fetchUrl(`https://${target.domain}/`);
  if (!home.ok && !target.domain.startsWith('www.')) {
    await sleep(300);
    home = await fetchUrl(`https://www.${target.domain}/`);
  }

  // Fallback Playwright si bloqué
  let useBrowser = false;
  if (!home.ok && shouldFallbackToBrowser(home.reason)) {
    log(`  ↻ fallback Playwright (${home.reason})`, 'yellow');
    useBrowser = true;
    home = await fetchUrlWithBrowser(`https://${target.domain}/`);
    if (!home.ok && !target.domain.startsWith('www.')) {
      home = await fetchUrlWithBrowser(`https://www.${target.domain}/`);
    }
  }

  await sleep(SLEEP_BETWEEN_REQUESTS_MS);

  if (home.ok) {
    visited.add(home.finalUrl);
    collectFromPage(home.body, target, found, hunterEmails);
  } else {
    log(`  homepage inaccessible : ${home.reason}`, 'yellow');
    return Array.from(found.values());
  }

  // Détermine le hostname (avec ou sans www) après redirections
  let baseHost = target.domain;
  if (home.finalUrl) {
    try { baseHost = new URL(home.finalUrl).hostname; } catch {}
  }

  const fetchFn = useBrowser ? fetchUrlWithBrowser : fetchUrl;
  const pathList = useBrowser ? BROWSER_PATHS : CANDIDATE_PATHS;
  // Sleep réduit en mode browser (le navigateur est déjà lent)
  const sleepMs = useBrowser ? 200 : SLEEP_BETWEEN_REQUESTS_MS;

  // Priorité 2 : chemins candidats classiques
  for (const p of pathList) {
    if (p === '/') continue;
    const url = `https://${baseHost}${p}`;
    if (visited.has(url)) continue;
    const res = await fetchFn(url);
    visited.add(url);
    await sleep(sleepMs);
    if (res.ok) collectFromPage(res.body, target, found, hunterEmails);
  }

  // Priorité 3 : liens "staff/about/team" découverts dans la home
  const discovered = findStaffLinks(home.body, target.domain);
  // Cap plus serré en mode browser
  const maxDiscovered = useBrowser ? 4 : 8;
  for (const url of discovered.slice(0, maxDiscovered)) {
    if (visited.has(url)) continue;
    visited.add(url);
    const res = await fetchFn(url);
    await sleep(sleepMs);
    if (res.ok) collectFromPage(res.body, target, found, hunterEmails);
  }

  return Array.from(found.values());
}

function collectFromPage(html, target, found, hunterEmails) {
  const accepted = getAcceptedDomainsForTarget(target.domain);
  const emails = extractEmailsForDomains(html, accepted);
  for (const email of emails) {
    if (hunterEmails.has(email)) continue; // dédup vs Hunter
    if (found.has(email)) continue;       // dédup intra-session
    const [local, emailDomain] = email.split('@');
    const kind = classifyEmail(email);
    const { first, last } = guessNameFromLocal(local);
    const ctx = extractContextForEmail(html, email).slice(0, 250);
    found.set(email, {
      media: target.label,
      city: target.city,
      domain: target.domain,
      email_domain: emailDomain,
      first_name: first,
      last_name: last,
      email,
      kind,
      context: ctx,
    });
    hunterEmails.add(email);
  }
}

// --- Main ---------------------------------------------------------------

// Charge les domaines déjà scrapés depuis le CSV existant (pour resume après crash)
function loadExistingRows(csvPath) {
  if (!fs.existsSync(csvPath)) return { rows: [], seenDomains: new Set() };
  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split('\n');
  const rows = [];
  const seenDomains = new Set();
  // Parse simple ligne par ligne (CSV escaping minimal — on ne lit que les colonnes 1-8)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // Parse manuel pour respecter les quotes
    const fields = [];
    let cur = '', inQ = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (inQ) {
        if (ch === '"' && line[j + 1] === '"') { cur += '"'; j++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { fields.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    fields.push(cur);
    if (fields.length < 8) continue;
    rows.push({
      media: fields[0], city: fields[1], domain: fields[2], email_domain: fields[3],
      first_name: fields[4], last_name: fields[5], email: fields[6], kind: fields[7],
      context: fields[8] || ''
    });
    seenDomains.add(fields[2]);
  }
  return { rows, seenDomains };
}

// Wrapper avec timeout strict pour ne pas se bloquer sur un domaine récalcitrant
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms (${label})`)), ms))
  ]);
}

async function main() {
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const hunterEmails = loadHunterEmails(HUNTER_CSV);

  // RESUME : charger le CSV existant et skipper les domaines déjà scrapés
  const { rows: existingRows, seenDomains } = loadExistingRows(OUTPUT_CSV);
  const allRows = [...existingRows];
  if (existingRows.length > 0) {
    log(`📂 Reprise : ${existingRows.length} contacts déjà sauvegardés, ${seenDomains.size} domaines déjà scrapés`, 'cyan');
  }

  // Aussi exclure les emails existants des prochaines extractions (déduplication)
  for (const r of existingRows) hunterEmails.add(r.email);

  const PER_DOMAIN_TIMEOUT_MS = 90_000; // skip si un domaine prend > 90s
  let processed = 0;
  let skippedAlreadyDone = 0;
  for (const target of DOMAINS) {
    processed++;
    if (seenDomains.has(target.domain)) {
      skippedAlreadyDone++;
      continue; // déjà scrapé dans une session précédente
    }
    log(`\n[${processed}/${DOMAINS.length}] → ${target.label} (${target.domain})`, 'cyan');
    try {
      const rows = await withTimeout(crawlDomain(target, hunterEmails), PER_DOMAIN_TIMEOUT_MS, target.domain);
      if (rows.length === 0) {
        log(`  aucun email trouvé`, 'gray');
      } else {
        const personal = rows.filter((r) => r.kind === 'personal' || r.kind === 'maybe_personal').length;
        const press = rows.filter((r) => r.kind === 'press_generic').length;
        const generic = rows.filter((r) => r.kind === 'generic').length;
        log(`  +${rows.length} emails (perso ${personal} / press ${press} / generic ${generic})`, 'green');
        allRows.push(...rows);
      }
    } catch (err) {
      log(`  ⚠ erreur: ${err.message}`, 'red');
      // Si timeout : fermer le browser pour repartir clean au prochain domaine
      if (/timeout/.test(err.message)) {
        await closeBrowser().catch(() => {});
      }
    }

    // Sauvegarde incrémentale tous les 5 domaines (sécurité si crash)
    if (processed % 5 === 0) writeCsv(allRows);
  }
  if (skippedAlreadyDone > 0) log(`\n📂 ${skippedAlreadyDone} domaines skippés (déjà scrapés)`, 'gray');

  writeCsv(allRows);
  await closeBrowser();

  log(`\n--- Bilan ---`, 'cyan');
  log(`Domaines traités       : ${DOMAINS.length}`, 'gray');
  log(`Nouveaux emails extraits : ${allRows.length}`, 'green');
  const byKind = allRows.reduce((acc, r) => { acc[r.kind] = (acc[r.kind] || 0) + 1; return acc; }, {});
  log(`Répartition : ${JSON.stringify(byKind)}`, 'gray');
  log(`CSV : ${OUTPUT_CSV}`, 'cyan');
}

function writeCsv(rows) {
  const header = ['media', 'city', 'domain', 'email_domain', 'first_name', 'last_name', 'email', 'kind', 'context'];
  const csv = [header.join(',')]
    .concat(rows.map((r) => header.map((h) => csvEscape(r[h])).join(',')))
    .join('\n');
  fs.writeFileSync(OUTPUT_CSV, csv, 'utf8');
}

main().catch(async (err) => {
  log(`\n❌ ${err.message}`, 'red');
  await closeBrowser();
  process.exit(1);
});
