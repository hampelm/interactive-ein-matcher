/*globals
Papa, FuzzySet, localStorage
*/

// TODO
// - When a result is clicked, add it to the list with name, ein,
// and original name
// - Use URL to move forward/backward between orgs
// - Export results as CSV.
// - Mark orgs as not a nonprofit / national nonprofit?

$(function() {
  var orgs, irs, searchSet, selectedOrg;
  searchSet = new FuzzySet([]);

  var $search = $('#search');

  var resultTemplate = _.template($('#template-results').html());

  function store(result) {
    console.log("storing org", result);

    // Get the full details of the org at this index
    var storedResults = JSON.parse(localStorage.getItem('results'));
    console.log("Got JSON", storedResults);

    if (storedResults === null) {
      storedResults = [];
    }

    storedResults.push({
      org: selectedOrg.Org_name,
      nid: selectedOrg.Id,
      irs_name: result.NAME,
      ein: result.EIN,
      notes: result.notes
    });

    localStorage.setItem('results', JSON.stringify(storedResults));

    setOrg();
  }

  function search(val) {
    var results = searchSet.get(val);
    console.log("Typed", results);

    // Empty the template to get ready to display results.
    $('#results').html('');
    var fullResults = [];

    // We'll get a list of results.
    _.each(results, function(result) {
      // Find the full org record
      // We'll need that to get the EIN.
      var org = _.find(irs, { NAME: result[1] });
      fullResults.push(org);

      var $result = $(resultTemplate({ org: org }));

      // If a result is selected, display it.
      $result.on('click', function(e) {
        store(org);
      }.bind(this));

      // Display the result
      $('#results').append($result);

    });
  }

  function setupSearch() {
    // Get the org names from the IRS file
    // At least one is undefined so we need to remove it.
    var names = _.remove(_.pluck(irs, 'NAME'), function(n) {
      return n !== undefined;
    });

    // Create a search set with the list of names
    searchSet = new FuzzySet(names);

    $search.on('input', function(e) {
      var val = e.target.value;
      search(val);
    });

    $('#other').click(function() {
      store({
        notes: "other"
      });
    });
    $('#out-of-state').click(function() {
      store({
        notes: "out-of-state"
      });
    });
  }

  function csvOut() {
    var storedResults = JSON.parse(localStorage.getItem('results'));
    var csv = Papa.unparse({
      fields: ['org', 'nid', 'irs_name', 'ein', 'notes'],
      data: storedResults
    });
    console.log("Got CSV");
    $('#data').html(csv);
  }

  function setOrg() {
    // Get the last saved index
    var idx = parseInt(_.trimLeft(window.location.hash, '#'), 10); //parseInt(localStorage.getItem('next'), 10);
    console.log("hash", window.location.hash);
    if (idx === '' || isNaN(idx)) {
      var storedResults = JSON.parse(localStorage.getItem('results'));
      if (storedResults.length) {
        window.location.hash = '#' + storedResults.length;
        idx = storedResults.length;
      } else {
        window.location.hash = '#' + 0;
        idx = 0;
      }
    } else {
      // Increment the index by 1
      idx += 1;
      window.location.hash = '#' + idx;
    }

    // Find the org at that index
    selectedOrg = orgs[idx];
    if (selectedOrg) {
      $('#name').html(selectedOrg.Org_name);
    } else {
      $('#name').html("I think you're done");
    }

    csvOut();

    // Try to search for it
    $search.val(selectedOrg.Org_name);
    search(selectedOrg.Org_name);
  }

  function start(results) {
    orgs = results.data;
    $('.next').click(setOrg);

    $('.clear').click(function() {
      localStorage.clear();
      window.location.hash = 0;
      setOrg();
    });

    setupSearch();
    setOrg();
    csvOut();
  }

  function gotIRS(results) {
    // console.log("IRS:", results.data);
    irs = results.data;

     Papa.parse('./organizations.csv', {
      download: true,
      header: true,
      complete: start
    });
  }

  Papa.parse('./eo_mi.csv', {
    download: true,
    header: true,
    complete: gotIRS
  });

});
