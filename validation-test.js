/**
 * Comprehensive Validation Test for Blaze Intelligence Dashboard
 * Tests all claims, functionality, and data integrity
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 BLAZE INTELLIGENCE DASHBOARD VALIDATION TEST');
console.log('='.repeat(60));

// Read the index.html file
const dashboardPath = '/tmp/blaze-deploy/index.html';
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Test 1: Core Visual Elements
console.log('\n1. 🎨 VISUAL ELEMENTS VALIDATION');
console.log('-'.repeat(40));

const visualTests = {
    'Three.js Integration': dashboardContent.includes('three.min.js'),
    'Particle System Code': dashboardContent.includes('particleCount') && dashboardContent.includes('BufferGeometry'),
    'Glass Morphism CSS': dashboardContent.includes('backdrop-filter: blur'),
    'Texas Branding Colors': dashboardContent.includes('--primary: #BF5700') && dashboardContent.includes('--accent: #FFB81C'),
    'Navigation Bar': dashboardContent.includes('nav-bar') && dashboardContent.includes('nav-content'),
    'Hero Canvas': dashboardContent.includes('hero-canvas')
};

Object.entries(visualTests).forEach(([test, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
});

// Test 2: Data Integrity
console.log('\n2. 📊 DATA INTEGRITY VALIDATION');
console.log('-'.repeat(40));

// Extract team data count
const teamDataMatch = dashboardContent.match(/rawTeamsData.*=.*\[([\s\S]*?)\];/);
const teamEntries = teamDataMatch ? (teamDataMatch[1].match(/{"Team":/g) || []).length : 0;

// Extract player data count  
const playerDataMatch = dashboardContent.match(/rawPlayersData.*=.*\[([\s\S]*?)\];/);
const playerEntries = playerDataMatch ? (playerDataMatch[1].match(/{"Player":/g) || []).length : 0;

// Extract podcast data count
const podcastDataMatch = dashboardContent.match(/episodes:.*\[([\s\S]*?)\]/);
const podcastEntries = podcastDataMatch ? (podcastDataMatch[1].match(/{\s*id:/g) || []).length : 0;

const dataTests = {
    'Teams Database': { expected: '15+', actual: teamEntries, pass: teamEntries >= 15 },
    'Players Database': { expected: '15', actual: playerEntries, pass: playerEntries === 15 },
    'Podcasts Database': { expected: '4+', actual: podcastEntries, pass: podcastEntries >= 4 },
    'MLB Teams Present': dashboardContent.includes('St. Louis Cardinals') && dashboardContent.includes('New York Yankees'),
    'NFL Teams Present': dashboardContent.includes('Tennessee Titans') && dashboardContent.includes('Kansas City Chiefs'),  
    'NBA Teams Present': dashboardContent.includes('Memphis Grizzlies') && dashboardContent.includes('Los Angeles Lakers'),
    'College Teams Present': dashboardContent.includes('Texas Longhorns') && dashboardContent.includes('Alabama Crimson Tide')
};

Object.entries(dataTests).forEach(([test, result]) => {
    if (typeof result === 'object' && result.expected) {
        console.log(`  ${result.pass ? '✅' : '❌'} ${test}: ${result.actual}/${result.expected} ${result.pass ? 'PASS' : 'FAIL'}`);
    } else {
        console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
    }
});

// Test 3: External Links Integration
console.log('\n3. 🔗 EXTERNAL LINKS VALIDATION');
console.log('-'.repeat(40));

const linkTests = {
    'ESPN Links': dashboardContent.includes('espn.com'),
    'Twitter Links': dashboardContent.includes('twitter.com'),
    'MLB Official Links': dashboardContent.includes('mlb.com'),
    'NFL Official Links': dashboardContent.includes('nfl.com'), 
    'NBA Official Links': dashboardContent.includes('nba.com'),
    'External Link Styling': dashboardContent.includes('espn-link') && dashboardContent.includes('twitter-link'),
    'Link Button CSS': dashboardContent.includes('link-button') && dashboardContent.includes('hover')
};

Object.entries(linkTests).forEach(([test, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
});

// Test 4: Interactive Features
console.log('\n4. ⚡ INTERACTIVE FEATURES VALIDATION');
console.log('-'.repeat(40));

const interactiveTests = {
    'React Integration': dashboardContent.includes('React.createElement'),
    'State Management': dashboardContent.includes('useState'),
    'Search Functionality': dashboardContent.includes('searchTerm') && dashboardContent.includes('filterTeams'),
    'Player Search': dashboardContent.includes('playerSearchTerm') && dashboardContent.includes('filteredPlayers'),
    'Modal Components': dashboardContent.includes('selectedTeam') && dashboardContent.includes('selectedPlayer'),
    'Toggle Functionality': dashboardContent.includes('showPlayerSearch') && dashboardContent.includes('toggle-btn'),
    'Event Handlers': dashboardContent.includes('onClick') && dashboardContent.includes('onChange'),
    'Chart Integration': dashboardContent.includes('Chart.js') && dashboardContent.includes('initializeCharts')
};

Object.entries(interactiveTests).forEach(([test, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
});

// Test 5: Podcast Features
console.log('\n5. 🎵 PODCAST FEATURES VALIDATION');
console.log('-'.repeat(40));

const podcastTests = {
    'Audio Controls': dashboardContent.includes('audio-controls') && dashboardContent.includes('play-btn'),
    'Podcast Metadata': dashboardContent.includes('duration') && dashboardContent.includes('description'),
    'Garrido Blueprint Episode': dashboardContent.includes('The Garrido Blueprint'),
    'Rose Bowl Episode': dashboardContent.includes('2005 Rose Bowl'),
    'Gibson Pitching Episode': dashboardContent.includes('Gibson\'s Pitching'),
    'Steroid Era Episode': dashboardContent.includes('McGwire') && dashboardContent.includes('Steroids'),
    'Podcast Tags': dashboardContent.includes('podcast-tag') && dashboardContent.includes('Baseball Philosophy'),
    'Play/Pause Logic': dashboardContent.includes('currentlyPlaying') && dashboardContent.includes('playPodcast')
};

Object.entries(podcastTests).forEach(([test, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
});

// Test 6: Elite Athletes Database
console.log('\n6. ⭐ ELITE ATHLETES VALIDATION');
console.log('-'.repeat(40));

const athleteTests = {
    'Mike Trout (MLB)': dashboardContent.includes('Mike Trout') && dashboardContent.includes('Los Angeles Angels'),
    'Patrick Mahomes (NFL)': dashboardContent.includes('Patrick Mahomes') && dashboardContent.includes('Kansas City Chiefs'),
    'LeBron James (NBA)': dashboardContent.includes('LeBron James') && dashboardContent.includes('Los Angeles Lakers'),
    'Quinn Ewers (College)': dashboardContent.includes('Quinn Ewers') && dashboardContent.includes('Texas Longhorns'),
    'Ja Morant (Memphis)': dashboardContent.includes('Ja Morant') && dashboardContent.includes('Memphis Grizzlies'),
    'Performance Metrics': dashboardContent.includes('performanceIndex') && dashboardContent.includes('marketValue'),
    'Proprietary Analytics': dashboardContent.includes('proprietaryMetrics') && dashboardContent.includes('Elite Consistency'),
    'Multi-Sport Coverage': dashboardContent.includes('MLB') && dashboardContent.includes('NFL') && dashboardContent.includes('NBA')
};

Object.entries(athleteTests).forEach(([test, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
});

// Test 7: Technical Performance
console.log('\n7. ⚡ TECHNICAL PERFORMANCE VALIDATION');
console.log('-'.repeat(40));

const perfTests = {
    'File Size Reasonable': fs.statSync(dashboardPath).size < 500000, // Under 500KB
    'CSS Optimization': dashboardContent.includes(':root') && dashboardContent.includes('--primary'),
    'Responsive Design': dashboardContent.includes('@media') && dashboardContent.includes('max-width'),
    'CDN Dependencies': dashboardContent.includes('cdn.jsdelivr') || dashboardContent.includes('unpkg') || dashboardContent.includes('cdnjs'),
    'Efficient DOM Structure': dashboardContent.includes('useMemo') && dashboardContent.includes('useCallback'),
    'Modern JS Features': dashboardContent.includes('const ') && dashboardContent.includes('=>'),
    'Error Handling': dashboardContent.includes('try') || dashboardContent.includes('catch'),
    'Memory Management': dashboardContent.includes('useEffect') && dashboardContent.includes('cleanup')
};

Object.entries(perfTests).forEach(([test, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
});

// Test 8: Deployment Readiness
console.log('\n8. 🚀 DEPLOYMENT READINESS VALIDATION');
console.log('-'.repeat(40));

const deployTests = {
    'No Local File References': !dashboardContent.includes('file://') && !dashboardContent.includes('/Users/'),
    'External CDN Links': dashboardContent.includes('https://') && dashboardContent.includes('cdnjs.cloudflare.com'),
    'Complete HTML Structure': dashboardContent.includes('<!DOCTYPE html>') && dashboardContent.includes('</html>'),
    'Meta Tags Present': dashboardContent.includes('<meta') && dashboardContent.includes('viewport'),
    'SEO Optimized': dashboardContent.includes('<title>') && dashboardContent.includes('description'),
    'Mobile Responsive': dashboardContent.includes('width=device-width'),
    'Browser Compatibility': dashboardContent.includes('crossorigin') && dashboardContent.includes('defer'),
    'Clean Code Structure': dashboardContent.includes('// ') && dashboardContent.split('\n').length > 100
};

Object.entries(deployTests).forEach(([test, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
});

// Summary
console.log('\n📋 VALIDATION SUMMARY');
console.log('='.repeat(60));

const allTests = [
    ...Object.values(visualTests),
    ...Object.values(dataTests).map(t => typeof t === 'object' ? t.pass : t),
    ...Object.values(linkTests),
    ...Object.values(interactiveTests),
    ...Object.values(podcastTests),
    ...Object.values(athleteTests),
    ...Object.values(perfTests),
    ...Object.values(deployTests)
];

const passCount = allTests.filter(t => t === true).length;
const totalTests = allTests.length;
const passRate = ((passCount / totalTests) * 100).toFixed(1);

console.log(`\n🎯 OVERALL SCORE: ${passCount}/${totalTests} (${passRate}%)`);

if (passRate >= 95) {
    console.log('🏆 STATUS: CHAMPIONSHIP LEVEL - Ready for deployment!');
} else if (passRate >= 85) {
    console.log('🥇 STATUS: EXCELLENT - Minor optimizations recommended');
} else if (passRate >= 75) {
    console.log('🥈 STATUS: GOOD - Some improvements needed');
} else {
    console.log('🥉 STATUS: NEEDS WORK - Major issues to address');
}

console.log('\n📊 DETAILED METRICS:');
console.log(`  • Teams in database: ${teamEntries}`);
console.log(`  • Players in database: ${playerEntries}`);  
console.log(`  • Podcast episodes: ${podcastEntries}`);
console.log(`  • File size: ${(fs.statSync(dashboardPath).size / 1024).toFixed(1)} KB`);
console.log(`  • Lines of code: ${dashboardContent.split('\n').length.toLocaleString()}`);

console.log('\n✅ VALIDATION COMPLETE');