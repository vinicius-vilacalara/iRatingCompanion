function calculateSessionScore(session) {
  const {
    start_position,
    final_position,
    irating_gain,
    safety_gain
  } = session;

  if (!start_position || !final_position) {
    return { finalScore: null, quality: '-' };
  }

  const delta = start_position - final_position;

  let positionScore = 50;

  if (delta > 0) {
    positionScore = 60 + (delta * 2);
  } else if (delta === 0) {
    if (final_position <= 3) positionScore = 75;
    else if (final_position <= 6) positionScore = 70;
    else positionScore = 40;
  } else {
    if(final_position <= 5){
      positionScore = 60 + (delta)
    } else {
      positionScore = 45 + (delta *2)
    }
  }
  positionScore = Math.max(20, positionScore);

  function getSRScore(gain) {
  if (gain >= 0.31) return 100; // Ótimo (Topo da escala)
  if (gain >= 0.10) return 80;  // Bom
  if (gain >= 0.01) return 60;  // Regular
  if (gain <= -0.01) return 20; // Péssimo (Base da escala)
  return 50; // Neutro/0.00
}

  const irScore = Math.min(100, Math.max(0, (parseInt(irating_gain) + 50)));
  const srScore = getSRScore(parseFloat(safety_gain));

  const finalScore = Math.max(0, Math.min(100, Math.round(
    positionScore * 0.4 + 
    irScore * 0.3 +  
    srScore * 0.3   
  )));

  let quality = 'Average';
  if (finalScore >= 65) quality = 'Good';
  if (finalScore < 40) quality = 'Bad';

  const tags = [];
  if (delta > 5) tags.push('Big Position Gain');
  if (delta < -3) tags.push('Big lost positions');

  if(safety_gain > 0.1) tags.push('Clean Race');
  if(safety_gain < 0) tags.push('Incidents');

  if(irating_gain > 50) tags.push('Strong IR gain');
  if(irating_gain < 0) tags.push('IR Loss');

  if (start_position > 6 && final_position <= 5) tags.push('Recovered Well');

  if (final_position === 1) tags.push('Win 🏆');

  if (final_position <= 3) tags.push('Podium');

  console.log("TAGS:", tags)

  return { finalScore, quality, tags };

 
}

module.exports = { calculateSessionScore };