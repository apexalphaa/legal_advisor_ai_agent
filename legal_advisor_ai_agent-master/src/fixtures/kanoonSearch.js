// Mock /search/ responses for INDIAN_KANOON_MOCK=true, matching the REAL field
// structure confirmed by a live API call (see conversation history / commit
// notes): tid (not docid), headline with literal <b> tags, docsource as free
// text, doctype as an undocumented numeric code, bench as numeric IDs, and
// author/authorEncoded/citation present only inconsistently.
//
// All docsource values here are genuine Supreme Court / High Court names,
// simulating what a correctly-filtered ("doctypes:supremecourt,...,highcourts"
// embedded in formInput) response should look like — i.e. no district courts,
// tribunals, or bare Acts leaking through.

const POOL = [
  {
    tid: 100001,
    doctype: 1010,
    publishdate: "2010-01-28",
    bench: [1649, 1248],
    title: "Smt Seema vs Ashok Kumar Singh on 28 January, 2010",
    numcites: 49,
    numcitedby: 3,
    headline: "claim for <b>damages</b> arising out of <b>construction</b> work causing injury to adjoining <b>property</b>",
    docsource: "Chattisgarh High Court",
    author: "R Gupta",
    authorEncoded: "r-gupta",
  },
  {
    tid: 100002,
    doctype: 1017,
    publishdate: "2014-11-14",
    bench: [835, 844],
    title: "Ramesh Chandra vs State of Gujarat on 14 November, 2014",
    numcites: 29,
    numcitedby: 13,
    headline: "encroachment and <b>damage</b> to <b>boundary</b> <b>wall</b> by neighbouring <b>construction</b>, claim for compensation",
    docsource: "Gujarat High Court",
    author: "M R Shah",
    authorEncoded: "m-r-shah",
    citation: "AIR 2015 GUJ 88",
  },
  {
    tid: 100003,
    doctype: 88,
    publishdate: "2018-06-02",
    bench: null,
    title: "Krishnan Nair vs Union of India on 2 June, 2018",
    numcites: 5,
    numcitedby: 0,
    headline: "suit for mandatory injunction and <b>damages</b> for <b>property</b> <b>damage</b> caused during adjacent <b>construction</b>",
    docsource: "Kerala High Court",
    // no author / authorEncoded / citation on this one — must be handled gracefully
  },
  {
    tid: 100004,
    doctype: 1024,
    publishdate: "2019-03-14",
    bench: [1797],
    title: "Shri Ram General Insurance Company Ltd vs Beant Kaur And Ors on 14 March, 2019",
    numcites: 18,
    numcitedby: 164,
    headline: "claimants filed a petition under <b>Sections</b> <b>166</b> and 140 of the <b>Motor</b> <b>Vehicles</b> <b>Act</b> seeking <b>compensation</b>",
    docsource: "Punjab-Haryana High Court",
    author: "L Gill",
    authorEncoded: "l-gill",
  },
  {
    tid: 100005,
    doctype: 1021,
    publishdate: "2006-11-04",
    bench: [1419],
    title: "Smt. Bhagwati Bai And Anr. vs Bablu @ Mukund And Ors. on 4 November, 2006",
    numcites: 11,
    numcitedby: 35,
    headline: "application for <b>compensation</b> under <b>Section</b> <b>166</b> of the <b>Motor</b> <b>Vehicles</b> <b>Act</b>, 1988, arising out of a hit and run <b>accident</b>",
    docsource: "Madhya Pradesh High Court",
    author: "A K Patnaik",
    authorEncoded: "a-k-patnaik",
    citation: "2007ACJ682",
  },
  {
    tid: 100006,
    doctype: 10001,
    publishdate: "2021-04-20",
    bench: null,
    title: "National Insurance Co. Ltd vs Venkatesh G on 20 April, 2021",
    numcites: 13,
    numcitedby: 2,
    headline: "hit and run <b>accident</b> claim, driver fled the scene, <b>compensation</b> under <b>Section</b> <b>166</b> <b>Motor</b> <b>Vehicles</b> <b>Act</b>",
    docsource: "Karnataka High Court",
    // no author / citation
  },
  {
    tid: 100007,
    doctype: 1009,
    publishdate: "2016-02-01",
    bench: [385, 350, 376],
    title: "Dr.Gangaraju Sowmini vs Alavala Sudhakar Reddy & Another on 1 February, 2016",
    numcites: 32,
    numcitedby: 18,
    headline: "<b>Motor</b> <b>Vehicles</b> <b>Act</b> claims for <b>compensation</b> under <b>Section</b> 140 and <b>Section</b> <b>166</b>",
    docsource: "Andhra Pradesh High Court",
    citation: "AIR 2016 HYDERABAD 162",
  },
  {
    tid: 100008,
    doctype: 1207,
    publishdate: "2015-08-19",
    bench: [220],
    title: "State of Karnataka vs Manjunath on 19 August, 2015",
    numcites: 21,
    numcitedby: 7,
    headline: "cruelty and <b>dowry</b> demand, offence under <b>Section</b> <b>498A</b> and <b>Section</b> 323 <b>IPC</b>",
    docsource: "Karnataka High Court",
    author: "K S Dixit",
    authorEncoded: "k-s-dixit",
  },
  {
    tid: 100009,
    doctype: 5,
    publishdate: "2012-09-03",
    bench: [77],
    title: "Sarita Devi vs Rajesh Kumar on 3 September, 2012",
    numcites: 60,
    numcitedby: 41,
    headline: "wife subjected to <b>cruelty</b> for <b>dowry</b>, husband and in-laws demanding cash and vehicle, <b>Section</b> <b>498A</b> <b>IPC</b>",
    docsource: "Supreme Court of India",
    author: "K S Radhakrishnan",
    authorEncoded: "k-s-radhakrishnan",
    citation: "(2013) 2 SCC 114",
  },
  {
    tid: 100010,
    doctype: 6,
    publishdate: "2020-01-17",
    bench: [901],
    title: "Anita Sharma vs State of Delhi & Anr on 17 January, 2020",
    numcites: 8,
    numcitedby: 1,
    headline: "quashing of FIR under <b>Section</b> <b>498A</b> <b>IPC</b> and Dowry Prohibition <b>Act</b> on ground of settlement",
    docsource: "Delhi High Court",
    // no author / citation
  },
  {
    tid: 100011,
    doctype: 1300,
    publishdate: "2017-05-22",
    bench: [412],
    title: "Ashok Traders vs Modern Suppliers Pvt Ltd on 22 May, 2017",
    numcites: 15,
    numcitedby: 4,
    headline: "advance payment for goods, non-delivery, <b>cheating</b> under <b>Section</b> <b>420</b> <b>IPC</b> and criminal breach of trust",
    docsource: "Delhi High Court",
    author: "S Muralidhar",
    authorEncoded: "s-muralidhar",
  },
  {
    tid: 100012,
    doctype: 1301,
    publishdate: "2019-11-08",
    bench: null,
    title: "Vikram Enterprises vs Bharat Distributors on 8 November, 2019",
    numcites: 6,
    numcitedby: 0,
    headline: "quashing of criminal complaint, advance payment dispute held to be purely a commercial/civil dispute, <b>Section</b> <b>406</b> and <b>420</b> <b>IPC</b>",
    docsource: "Delhi High Court",
    citation: "2020 CRLJ 55",
  },
  {
    tid: 100013,
    doctype: 7,
    publishdate: "2011-03-30",
    bench: [55],
    title: "Union of India vs Suresh Chand on 30 March, 2011",
    numcites: 90,
    numcitedby: 210,
    headline: "principles governing <b>criminal</b> <b>breach</b> of <b>trust</b> and <b>cheating</b> distinguished from civil <b>contract</b> disputes",
    docsource: "Supreme Court of India",
    author: "P Sathasivam",
    authorEncoded: "p-sathasivam",
    citation: "(2011) 5 SCC 220",
  },
  {
    tid: 100014,
    doctype: 1400,
    publishdate: "2013-07-12",
    bench: [640],
    title: "Meena Kumari vs Suresh Yadav on 12 July, 2013",
    numcites: 22,
    numcitedby: 9,
    headline: "boundary <b>wall</b> dispute between adjoining <b>property</b> owners, tortious liability for <b>damage</b> caused by excavation",
    docsource: "Rajasthan High Court",
    author: "N K Jain",
    authorEncoded: "n-k-jain",
  },
];

/**
 * Returns a mock search response for the given formInput. Uses a hash of the
 * query text to pick a sliding window over the fixture pool, so different
 * search queries return overlapping-but-different result sets — enough to
 * exercise Module 2's cross-query deduplication logic.
 */
export function getMockSearchResponse(formInput) {
  const hash = [...formInput].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const windowSize = 6;
  const start = hash % Math.max(POOL.length - windowSize, 1);
  const docs = POOL.slice(start, start + windowSize);

  return {
    categories: [],
    docs,
    found: `1 - ${docs.length} of ${POOL.length}`,
    encodedformInput: encodeURIComponent(formInput),
  };
}
