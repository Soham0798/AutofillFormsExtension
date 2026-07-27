const PROFILE_SCHEMA_KEYS = [
    "first_name", "last_name", "email", "phone", "dob", "street_address",
    "city", "state", "zip", "country", "employer", "job_title",
];

const SYNONYMS = {
    first_name: ["first name", "firstname", "fname", "given name"],
  last_name: ["last name", "lastname", "lname", "surname", "family name"],
  email: ["email", "e-mail", "e mail", "email address"],
  phone: ["phone", "telephone", "tel", "mobile", "cell", "phone number"],
  dob: ["dob", "date of birth", "birth date", "birthdate", "birthday"],
  street_address: ["street address", "address line 1", "address", "mailing address"],
  city: ["city", "town"],
  state: ["state", "province", "region"],
  zip: ["zip", "zipcode", "zip code", "postal code", "postcode"],
  country: ["country", "nation"],
  employer: ["employer", "company", "company name", "organization"],
  job_title: ["job title", "title", "position", "role", "occupation"],
};

if(typeof globalThis!=="undefined"){
    globalThis.PROFILE_SCHEMA_KEYS = PROFILE_SCHEMA_KEYS;
}

