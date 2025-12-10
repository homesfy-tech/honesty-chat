const COUNTRY_PHONE_CODES = [
  { code: "+91", name: "India", countryCode: "IN" },
  { code: "+1", name: "USA", countryCode: "US" },
  { code: "+44", name: "UK", countryCode: "GB" },
  { code: "+971", name: "UAE", countryCode: "AE" },
  { code: "+61", name: "Australia", countryCode: "AU" },
  { code: "+1", name: "Canada", countryCode: "CA" },
  { code: "+65", name: "Singapore", countryCode: "SG" },
  { code: "+86", name: "China", countryCode: "CN" },
  { code: "+81", name: "Japan", countryCode: "JP" },
  { code: "+49", name: "Germany", countryCode: "DE" },
  { code: "+33", name: "France", countryCode: "FR" },
  { code: "+39", name: "Italy", countryCode: "IT" },
  { code: "+34", name: "Spain", countryCode: "ES" },
  { code: "+92", name: "Pakistan", countryCode: "PK" },
  { code: "+880", name: "Bangladesh", countryCode: "BD" },
  { code: "+94", name: "Sri Lanka", countryCode: "LK" },
  { code: "+977", name: "Nepal", countryCode: "NP" },
  { code: "+60", name: "Malaysia", countryCode: "MY" },
  { code: "+66", name: "Thailand", countryCode: "TH" },
  { code: "+62", name: "Indonesia", countryCode: "ID" },
  { code: "+63", name: "Philippines", countryCode: "PH" },
  { code: "+84", name: "Vietnam", countryCode: "VN" },
  { code: "+852", name: "Hong Kong", countryCode: "HK" },
  { code: "+966", name: "Saudi Arabia", countryCode: "SA" },
  { code: "+973", name: "Bahrain", countryCode: "BH" },
  { code: "+965", name: "Kuwait", countryCode: "KW" },
  { code: "+974", name: "Qatar", countryCode: "QA" },
  { code: "+968", name: "Oman", countryCode: "OM" },
  { code: "+20", name: "Egypt", countryCode: "EG" },
  { code: "+27", name: "South Africa", countryCode: "ZA" },
  { code: "+234", name: "Nigeria", countryCode: "NG" },
  { code: "+254", name: "Kenya", countryCode: "KE" },
  { code: "+55", name: "Brazil", countryCode: "BR" },
  { code: "+52", name: "Mexico", countryCode: "MX" },
  { code: "+54", name: "Argentina", countryCode: "AR" },
  { code: "+7", name: "Russia", countryCode: "RU" },
  { code: "+380", name: "Ukraine", countryCode: "UA" },
  { code: "+48", name: "Poland", countryCode: "PL" },
  { code: "+90", name: "Turkey", countryCode: "TR" },
  { code: "+213", name: "Algeria", countryCode: "DZ" },
  { code: "+376", name: "Andorra", countryCode: "AD" },
  { code: "+244", name: "Angola", countryCode: "AO" },
  { code: "+1264", name: "Anguilla", countryCode: "AI" },
  { code: "+1268", name: "Antigua & Barbuda", countryCode: "AG" },
  { code: "+374", name: "Armenia", countryCode: "AM" },
  { code: "+297", name: "Aruba", countryCode: "AW" },
  { code: "+43", name: "Austria", countryCode: "AT" },
  { code: "+994", name: "Azerbaijan", countryCode: "AZ" },
  { code: "+1242", name: "Bahamas", countryCode: "BS" },
  { code: "+1246", name: "Barbados", countryCode: "BB" },
  { code: "+375", name: "Belarus", countryCode: "BY" },
  { code: "+32", name: "Belgium", countryCode: "BE" },
  { code: "+501", name: "Belize", countryCode: "BZ" },
  { code: "+229", name: "Benin", countryCode: "BJ" },
  { code: "+1441", name: "Bermuda", countryCode: "BM" },
  { code: "+975", name: "Bhutan", countryCode: "BT" },
  { code: "+591", name: "Bolivia", countryCode: "BO" },
  { code: "+387", name: "Bosnia Herzegovina", countryCode: "BA" },
  { code: "+267", name: "Botswana", countryCode: "BW" },
  { code: "+673", name: "Brunei", countryCode: "BN" },
  { code: "+359", name: "Bulgaria", countryCode: "BG" },
  { code: "+226", name: "Burkina Faso", countryCode: "BF" },
  { code: "+257", name: "Burundi", countryCode: "BI" },
  { code: "+855", name: "Cambodia", countryCode: "KH" },
  { code: "+237", name: "Cameroon", countryCode: "CM" },
  { code: "+238", name: "Cape Verde Islands", countryCode: "CV" },
  { code: "+1345", name: "Cayman Islands", countryCode: "KY" },
  { code: "+236", name: "Central African Republic", countryCode: "CF" },
  { code: "+56", name: "Chile", countryCode: "CL" },
  { code: "+57", name: "Colombia", countryCode: "CO" },
  { code: "+269", name: "Comoros", countryCode: "KM" },
  { code: "+242", name: "Congo", countryCode: "CG" },
  { code: "+682", name: "Cook Islands", countryCode: "CK" },
  { code: "+506", name: "Costa Rica", countryCode: "CR" },
  { code: "+385", name: "Croatia", countryCode: "HR" },
  { code: "+357", name: "Cyprus", countryCode: "CY" },
  { code: "+420", name: "Czech Republic", countryCode: "CZ" },
  { code: "+45", name: "Denmark", countryCode: "DK" },
  { code: "+253", name: "Djibouti", countryCode: "DJ" },
  { code: "+372", name: "Estonia", countryCode: "EE" },
  { code: "+251", name: "Ethiopia", countryCode: "ET" },
  { code: "+358", name: "Finland", countryCode: "FI" },
  { code: "+995", name: "Georgia", countryCode: "GE" },
  { code: "+233", name: "Ghana", countryCode: "GH" },
  { code: "+30", name: "Greece", countryCode: "GR" },
  { code: "+852", name: "Hong Kong", countryCode: "HK" },
  { code: "+36", name: "Hungary", countryCode: "HU" },
  { code: "+354", name: "Iceland", countryCode: "IS" },
  { code: "+353", name: "Ireland", countryCode: "IE" },
  { code: "+972", name: "Israel", countryCode: "IL" },
  { code: "+1876", name: "Jamaica", countryCode: "JM" },
  { code: "+962", name: "Jordan", countryCode: "JO" },
  { code: "+7", name: "Kazakhstan", countryCode: "KZ" },
  { code: "+82", name: "Korea South", countryCode: "KR" },
  { code: "+961", name: "Lebanon", countryCode: "LB" },
  { code: "+370", name: "Lithuania", countryCode: "LT" },
  { code: "+60", name: "Malaysia", countryCode: "MY" },
  { code: "+960", name: "Maldives", countryCode: "MV" },
  { code: "+356", name: "Malta", countryCode: "MT" },
  { code: "+230", name: "Mauritius", countryCode: "MU" },
  { code: "+377", name: "Monaco", countryCode: "MC" },
  { code: "+212", name: "Morocco", countryCode: "MA" },
  { code: "+31", name: "Netherlands", countryCode: "NL" },
  { code: "+64", name: "New Zealand", countryCode: "NZ" },
  { code: "+47", name: "Norway", countryCode: "NO" },
  { code: "+351", name: "Portugal", countryCode: "PT" },
  { code: "+40", name: "Romania", countryCode: "RO" },
  { code: "+221", name: "Senegal", countryCode: "SN" },
  { code: "+381", name: "Serbia", countryCode: "RS" },
  { code: "+421", name: "Slovakia", countryCode: "SK" },
  { code: "+386", name: "Slovenia", countryCode: "SI" },
  { code: "+211", name: "South Sudan", countryCode: "SS" },
  { code: "+46", name: "Sweden", countryCode: "SE" },
  { code: "+41", name: "Switzerland", countryCode: "CH" },
  { code: "+886", name: "Taiwan", countryCode: "TW" },
  { code: "+255", name: "Tanzania", countryCode: "TZ" },
  { code: "+216", name: "Tunisia", countryCode: "TN" },
  { code: "+256", name: "Uganda", countryCode: "UG" },
  { code: "+598", name: "Uruguay", countryCode: "UY" },
  { code: "+998", name: "Uzbekistan", countryCode: "UZ" },
  { code: "+58", name: "Venezuela", countryCode: "VE" },
  { code: "+260", name: "Zambia", countryCode: "ZM" },
  { code: "+263", name: "Zimbabwe", countryCode: "ZW" },
];

const SORTED_CODES = COUNTRY_PHONE_CODES.slice().sort(
  (a, b) => b.code.length - a.code.length
);

const INDIA_ENTRY = COUNTRY_PHONE_CODES.find((entry) => entry.code === "+91");

export function normalizePhone(raw) {
  if (typeof raw !== "string") {
    return { error: "Phone number must be a string." };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "Phone number is required." };
  }

  const stripped = trimmed.replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(stripped)) {
    return { error: "Phone numbers may only include digits and an optional +." };
  }

  const digitsOnly = stripped.replace(/\D/g, "");
  const withPlus = stripped.startsWith("+") ? stripped : `+${stripped}`;
  const explicit = SORTED_CODES.find((entry) => withPlus.startsWith(entry.code));

  let country = explicit ?? null;
  let subscriberDigits =
    explicit !== undefined
      ? withPlus.slice(explicit.code.length)
      : digitsOnly;

  if (!explicit && !stripped.startsWith("+")) {
    const looksLikeIsdPrefixed =
      digitsOnly.length === 12 && digitsOnly.startsWith("91");
    const digitsWithoutIsd = looksLikeIsdPrefixed
      ? digitsOnly.slice(2)
      : digitsOnly;
    country = INDIA_ENTRY ?? null;
    subscriberDigits = digitsWithoutIsd;
  }

  if (!country) {
    return { error: "Unsupported or missing country dial code." };
  }

  if (!subscriberDigits || !/^\d+$/.test(subscriberDigits)) {
    return { error: "Invalid subscriber number." };
  }

  if (country.code === "+91") {
    if (subscriberDigits.length !== 10) {
      return { error: "Indian mobile numbers must be exactly 10 digits." };
    }
    if (!/^[6-9]/.test(subscriberDigits)) {
      return {
        error: "Indian mobile numbers must start with 6, 7, 8, or 9.",
      };
    }
  } else if (subscriberDigits.length < 4 || subscriberDigits.length > 14) {
    return {
      error: "Please provide a valid mobile number for the selected country.",
    };
  }

  return {
    value: `${country.code}${subscriberDigits}`,
    country,
    subscriber: subscriberDigits,
  };
}

