
var ShapeLayerPreviewMap;
var CustomShapeMap;
var ShapeLayerBuilderPreviewShapeManager;
var CustomShapeLayerBuilderPreviewShapeManager;
var ShapeLayerBuilderPreviewMarkerArray = [];
var CustomShapeLayerBuilderPreviewMarkerArray = [];

var SEStatesDissolved = JSON.parse('{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"MultiPolygon","coordinates":[[[[-82.983386,24.602635],[-82.977736,24.656482],[-82.899928,24.717778],[-82.800177,24.726282],[-82.766681,24.66794],[-82.80441,24.604296],[-82.849053,24.576748],[-82.95816,24.581828],[-82.983386,24.602635]]],[[[-81.347015,30.712444],[-81.380867,30.627345],[-81.353574,30.44666],[-81.324877,30.424735],[-81.330627,30.299481],[-81.255134,30.000245],[-81.209268,29.875247],[-81.186399,29.76008],[-81.119814,29.59673],[-80.906836,29.144706],[-80.874815,29.105968],[-80.635573,28.750268],[-80.522973,28.608238],[-80.46939,28.453097],[-80.519428,28.391084],[-80.543999,28.271092],[-80.499773,28.07726],[-80.328113,27.750306],[-80.227962,27.463004],[-80.039102,27.029853],[-79.975425,26.80025],[-79.980648,26.595447],[-80.014362,26.362236],[-80.016904,26.257978],[-80.052257,25.974956],[-80.067685,25.902395],[-80.056056,25.837688],[-80.0965,25.652753],[-80.04351,25.598051],[-80.0567,25.555212],[-80.115671,25.541393],[-80.141757,25.434711],[-80.112612,25.375391],[-80.150013,25.31442],[-80.217862,25.295247],[-80.249773,25.179479],[-80.302899,25.144923],[-80.390435,25.057189],[-80.453365,24.963698],[-80.514343,24.940628],[-80.619896,24.854586],[-80.783375,24.76126],[-80.852228,24.748931],[-81.047648,24.64024],[-81.147686,24.649064],[-81.27169,24.597096],[-81.474733,24.553455],[-81.514615,24.564757],[-81.539924,24.486034],[-81.711831,24.429733],[-81.76287,24.449643],[-81.813522,24.417639],[-81.946441,24.399348],[-82.067171,24.523715],[-82.100333,24.499998],[-82.175098,24.499617],[-82.218964,24.54221],[-82.210239,24.590843],[-82.164692,24.629473],[-82.081731,24.635634],[-82.026643,24.607666],[-81.936739,24.656502],[-81.866423,24.663305],[-81.723528,24.725524],[-81.60277,24.799559],[-81.458887,24.86745],[-81.402473,24.881827],[-81.202322,24.868352],[-81.132429,24.805835],[-81.06447,24.791116],[-80.964288,24.819907],[-80.993976,24.910454],[-81.05511,24.971413],[-81.098489,25.066471],[-81.184409,25.125001],[-81.234044,25.234522],[-81.196077,25.357058],[-81.205709,25.410751],[-81.259117,25.479956],[-81.276004,25.535118],[-81.347231,25.636727],[-81.399194,25.659252],[-81.445143,25.737576],[-81.588095,25.809922],[-81.628669,25.771261],[-81.718139,25.793033],[-81.775286,25.880947],[-81.801041,25.973828],[-81.85034,26.062872],[-81.867882,26.214383],[-81.906149,26.331427],[-81.978126,26.399692],[-82.068898,26.371318],[-82.112221,26.377755],[-82.236453,26.4773],[-82.281846,26.61019],[-82.32191,26.665079],[-82.31793,26.734402],[-82.338319,26.803318],[-82.394753,26.875342],[-82.49982,27.043895],[-82.56474,27.2056],[-82.735158,27.415808],[-82.815377,27.535958],[-82.823669,27.575077],[-82.8057,27.709384],[-82.901337,27.839107],[-82.908909,27.890082],[-82.878105,28.04282],[-82.896633,28.080295],[-82.908311,28.206626],[-82.89215,28.245247],[-82.795276,28.299764],[-82.800268,28.354732],[-82.746195,28.44931],[-82.748738,28.532054],[-82.727392,28.595587],[-82.788007,28.709302],[-82.813037,28.791293],[-82.794786,28.857729],[-82.857828,28.942006],[-82.851278,29.017389],[-82.950078,29.076059],[-83.076,29.041819],[-83.14408,29.07284],[-83.171806,29.185921],[-83.233821,29.235728],[-83.238679,29.30861],[-83.297689,29.346075],[-83.36022,29.431083],[-83.449456,29.483351],[-83.46451,29.613319],[-83.544374,29.671453],[-83.609308,29.698416],[-83.647311,29.797139],[-83.745228,29.89382],[-83.808523,29.904346],[-84.043431,30.039755],[-84.109352,30.028084],[-84.184614,29.983069],[-84.251319,29.995969],[-84.256915,29.942848],[-84.298796,29.867126],[-84.338999,29.847125],[-84.44686,29.858732],[-84.512845,29.832042],[-84.542286,29.769797],[-84.639202,29.735214],[-84.73575,29.656375],[-84.927476,29.569628],[-85.031168,29.539088],[-85.234846,29.624999],[-85.292016,29.632273],[-85.381684,29.612853],[-85.429996,29.669967],[-85.474996,29.831542],[-85.446289,29.901033],[-85.505081,29.911781],[-85.587654,29.962518],[-85.632537,30.014255],[-85.767959,30.076404],[-85.826187,30.125185],[-85.947196,30.191446],[-86.18476,30.277966],[-86.397504,30.325354],[-86.645861,30.346173],[-86.908882,30.320226],[-87.138764,30.278493],[-87.296457,30.27269],[-87.518346,30.229506],[-87.647824,30.199211],[-87.807153,30.177378],[-88.003618,30.173417],[-88.074869,30.147149],[-88.162022,30.200093],[-88.384431,30.158543],[-88.425432,30.998323],[-88.451573,31.481531],[-88.473227,31.893856],[-88.428209,32.25103],[-88.354292,32.875131],[-88.294867,33.367103],[-88.210741,34.0292],[-88.135204,34.615878],[-88.097888,34.892202],[-88.152413,34.919741],[-88.200064,34.995634],[-88.202959,35.008028],[-87.429968,35.002791],[-86.836306,34.991899],[-86.467941,34.990486],[-85.605165,34.984678],[-85.379512,34.983035],[-84.952772,34.987943],[-84.321869,34.988408],[-83.619985,34.986592],[-83.108614,35.000659],[-82.784838,35.085699],[-82.763712,35.068209],[-82.641797,35.131817],[-82.431481,35.173187],[-82.419744,35.198613],[-82.27492,35.200071],[-81.686579,35.177658],[-81.069092,35.151242],[-81.03247,35.110033],[-81.041489,35.044703],[-80.93495,35.107409],[-80.782042,34.935785],[-80.797491,34.819752],[-80.164577,34.811656],[-79.6753,34.804744],[-79.358252,34.545579],[-79.201531,34.408634],[-78.874747,34.134395],[-78.499301,33.812852],[-78.635723,33.776679],[-78.772415,33.707967],[-78.887415,33.611975],[-78.993033,33.488992],[-79.034496,33.456834],[-79.087581,33.369287],[-79.120217,33.246932],[-79.086583,33.21531],[-79.091614,33.159056],[-79.140519,33.13962],[-79.215538,33.064248],[-79.273373,33.046559],[-79.322257,32.956078],[-79.440181,32.958916],[-79.495945,32.931572],[-79.534689,32.870012],[-79.637821,32.816377],[-79.691893,32.75924],[-79.760074,32.738257],[-79.798255,32.675632],[-79.918341,32.607264],[-79.979002,32.558074],[-80.088877,32.549029],[-80.121459,32.499192],[-80.198839,32.496241],[-80.243074,32.472449],[-80.374825,32.342453],[-80.392327,32.280317],[-80.523824,32.234592],[-80.584985,32.162589],[-80.66472,32.142607],[-80.748202,32.08449],[-80.751429,32.033468],[-80.789841,31.96439],[-80.855339,31.910809],[-80.938316,31.809008],[-80.970726,31.798353],[-81.049789,31.688633],[-81.087067,31.529158],[-81.190758,31.399876],[-81.172546,31.376831],[-81.18277,31.265846],[-81.234337,31.170258],[-81.296417,31.15188],[-81.297874,31.080952],[-81.345306,31.059362],[-81.304779,30.985712],[-81.400482,30.766426],[-81.347015,30.712444]]]]},"properties":{"type":"dissolved","label":"asdf","uniquelabel":"asdf","abbreviation":"","geoid":"","uniqueid":"","parentid":"","level":""}}]}');
var SEStatesNotDissolved = JSON.parse('{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"MultiPolygon","coordinates":[[[[-82.983386,24.602635],[-82.977736,24.656482],[-82.899928,24.717778],[-82.800177,24.726282],[-82.766681,24.66794],[-82.80441,24.604296],[-82.849053,24.576748],[-82.95816,24.581828],[-82.983386,24.602635]]],[[[-85.002499,31.000685],[-84.983527,30.935486],[-84.942525,30.888488],[-84.911122,30.751191],[-84.864693,30.711542],[-84.474409,30.692793],[-83.975655,30.67037],[-83.065223,30.620039],[-82.214677,30.568556],[-82.240403,30.53777],[-82.20124,30.485114],[-82.210733,30.42564],[-82.171623,30.359918],[-82.065598,30.358114],[-82.016906,30.475111],[-82.00581,30.565358],[-82.050217,30.674538],[-82.039795,30.747297],[-81.972458,30.779926],[-81.963928,30.8181],[-81.793968,30.787239],[-81.718109,30.744806],[-81.659805,30.751265],[-81.572395,30.721897],[-81.347015,30.712444],[-81.380867,30.627345],[-81.353574,30.44666],[-81.324877,30.424735],[-81.330627,30.299481],[-81.255134,30.000245],[-81.209268,29.875247],[-81.186399,29.76008],[-81.119814,29.59673],[-80.906836,29.144706],[-80.874815,29.105968],[-80.635573,28.750268],[-80.522973,28.608238],[-80.46939,28.453097],[-80.519428,28.391084],[-80.543999,28.271092],[-80.499773,28.07726],[-80.328113,27.750306],[-80.227962,27.463004],[-80.039102,27.029853],[-79.975425,26.80025],[-79.980648,26.595447],[-80.014362,26.362236],[-80.016904,26.257978],[-80.052257,25.974956],[-80.067685,25.902395],[-80.056056,25.837688],[-80.0965,25.652753],[-80.04351,25.598051],[-80.0567,25.555212],[-80.115671,25.541393],[-80.141757,25.434711],[-80.112612,25.375391],[-80.150013,25.31442],[-80.217862,25.295247],[-80.249773,25.179479],[-80.302899,25.144923],[-80.390435,25.057189],[-80.453365,24.963698],[-80.514343,24.940628],[-80.619896,24.854586],[-80.783375,24.76126],[-80.852228,24.748931],[-81.047648,24.64024],[-81.147686,24.649064],[-81.27169,24.597096],[-81.474733,24.553455],[-81.514615,24.564757],[-81.539924,24.486034],[-81.711831,24.429733],[-81.76287,24.449643],[-81.813522,24.417639],[-81.946441,24.399348],[-82.067171,24.523715],[-82.100333,24.499998],[-82.175098,24.499617],[-82.218964,24.54221],[-82.210239,24.590843],[-82.164692,24.629473],[-82.081731,24.635634],[-82.026643,24.607666],[-81.936739,24.656502],[-81.866423,24.663305],[-81.723528,24.725524],[-81.60277,24.799559],[-81.458887,24.86745],[-81.402473,24.881827],[-81.202322,24.868352],[-81.132429,24.805835],[-81.06447,24.791116],[-80.964288,24.819907],[-80.993976,24.910454],[-81.05511,24.971413],[-81.098489,25.066471],[-81.184409,25.125001],[-81.234044,25.234522],[-81.196077,25.357058],[-81.205709,25.410751],[-81.259117,25.479956],[-81.276004,25.535118],[-81.347231,25.636727],[-81.399194,25.659252],[-81.445143,25.737576],[-81.588095,25.809922],[-81.628669,25.771261],[-81.718139,25.793033],[-81.775286,25.880947],[-81.801041,25.973828],[-81.85034,26.062872],[-81.867882,26.214383],[-81.906149,26.331427],[-81.978126,26.399692],[-82.068898,26.371318],[-82.112221,26.377755],[-82.236453,26.4773],[-82.281846,26.61019],[-82.32191,26.665079],[-82.31793,26.734402],[-82.338319,26.803318],[-82.394753,26.875342],[-82.49982,27.043895],[-82.56474,27.2056],[-82.735158,27.415808],[-82.815377,27.535958],[-82.823669,27.575077],[-82.8057,27.709384],[-82.901337,27.839107],[-82.908909,27.890082],[-82.878105,28.04282],[-82.896633,28.080295],[-82.908311,28.206626],[-82.89215,28.245247],[-82.795276,28.299764],[-82.800268,28.354732],[-82.746195,28.44931],[-82.748738,28.532054],[-82.727392,28.595587],[-82.788007,28.709302],[-82.813037,28.791293],[-82.794786,28.857729],[-82.857828,28.942006],[-82.851278,29.017389],[-82.950078,29.076059],[-83.076,29.041819],[-83.14408,29.07284],[-83.171806,29.185921],[-83.233821,29.235728],[-83.238679,29.30861],[-83.297689,29.346075],[-83.36022,29.431083],[-83.449456,29.483351],[-83.46451,29.613319],[-83.544374,29.671453],[-83.609308,29.698416],[-83.647311,29.797139],[-83.745228,29.89382],[-83.808523,29.904346],[-84.043431,30.039755],[-84.109352,30.028084],[-84.184614,29.983069],[-84.251319,29.995969],[-84.256915,29.942848],[-84.298796,29.867126],[-84.338999,29.847125],[-84.44686,29.858732],[-84.512845,29.832042],[-84.542286,29.769797],[-84.639202,29.735214],[-84.73575,29.656375],[-84.927476,29.569628],[-85.031168,29.539088],[-85.234846,29.624999],[-85.292016,29.632273],[-85.381684,29.612853],[-85.429996,29.669967],[-85.474996,29.831542],[-85.446289,29.901033],[-85.505081,29.911781],[-85.587654,29.962518],[-85.632537,30.014255],[-85.767959,30.076404],[-85.826187,30.125185],[-85.947196,30.191446],[-86.18476,30.277966],[-86.397504,30.325354],[-86.645861,30.346173],[-86.908882,30.320226],[-87.138764,30.278493],[-87.296457,30.27269],[-87.518346,30.229506],[-87.49998,30.328957],[-87.450778,30.346999],[-87.440678,30.391498],[-87.369383,30.431948],[-87.435578,30.480496],[-87.445103,30.528909],[-87.393294,30.627218],[-87.406356,30.674437],[-87.501502,30.721092],[-87.544789,30.778395],[-87.626224,30.846664],[-87.588862,30.96579],[-87.598829,30.997455],[-87.140755,30.999532],[-86.704483,30.994668],[-86.12154,30.992884],[-85.568112,30.996244],[-85.002499,31.000685]]]]},"properties":{"type":"Administrative","label":"Florida","uniquelabel":"Florida","abbreviation":"FL","geoid":"12","uniqueid":"USA-12","parentid":"","level":"1"}},{"type":"Feature","geometry":{"type":"MultiPolygon","coordinates":[[[[-85.605165,34.984678],[-85.379512,34.983035],[-84.952772,34.987943],[-84.321869,34.988408],[-83.619985,34.986592],[-83.108614,35.000659],[-83.127357,34.950195],[-83.32415,34.787479],[-83.352692,34.716904],[-83.23258,34.611597],[-83.168278,34.590998],[-83.034565,34.483571],[-82.901551,34.486764],[-82.8644,34.459785],[-82.833571,34.364092],[-82.798658,34.341777],[-82.743172,34.251598],[-82.717459,34.150546],[-82.675219,34.129779],[-82.593887,34.028109],[-82.556765,33.945324],[-82.422808,33.863757],[-82.346933,33.834298],[-82.247472,33.752591],[-82.196584,33.630583],[-82.133523,33.590535],[-82.046335,33.56383],[-81.985938,33.486536],[-81.934136,33.468337],[-81.918337,33.332842],[-81.847736,33.307243],[-81.852822,33.248542],[-81.756935,33.197848],[-81.768235,33.167949],[-81.704634,33.11645],[-81.614994,33.095551],[-81.491899,33.006694],[-81.502716,32.938688],[-81.457061,32.850389],[-81.426475,32.840773],[-81.411839,32.762147],[-81.427505,32.702242],[-81.393033,32.651542],[-81.389205,32.595416],[-81.299796,32.563049],[-81.200408,32.468314],[-81.205572,32.423893],[-81.119784,32.286368],[-81.15577,32.245793],[-81.118237,32.189203],[-81.117225,32.117604],[-81.066965,32.090384],[-81.01197,32.100178],[-80.926769,32.041663],[-80.751429,32.033468],[-80.789841,31.96439],[-80.855339,31.910809],[-80.938316,31.809008],[-80.970726,31.798353],[-81.049789,31.688633],[-81.087067,31.529158],[-81.190758,31.399876],[-81.172546,31.376831],[-81.18277,31.265846],[-81.234337,31.170258],[-81.296417,31.15188],[-81.297874,31.080952],[-81.345306,31.059362],[-81.304779,30.985712],[-81.400482,30.766426],[-81.347015,30.712444],[-81.572395,30.721897],[-81.659805,30.751265],[-81.718109,30.744806],[-81.793968,30.787239],[-81.963928,30.8181],[-81.972458,30.779926],[-82.039795,30.747297],[-82.050217,30.674538],[-82.00581,30.565358],[-82.016906,30.475111],[-82.065598,30.358114],[-82.171623,30.359918],[-82.210733,30.42564],[-82.20124,30.485114],[-82.240403,30.53777],[-82.214677,30.568556],[-83.065223,30.620039],[-83.975655,30.67037],[-84.474409,30.692793],[-84.864693,30.711542],[-84.911122,30.751191],[-84.942525,30.888488],[-84.983527,30.935486],[-85.002499,31.000685],[-85.037062,31.109753],[-85.099647,31.164942],[-85.113261,31.264343],[-85.071621,31.468384],[-85.041428,31.539293],[-85.057473,31.618624],[-85.12593,31.696265],[-85.140731,31.857461],[-85.08213,31.944658],[-85.045063,32.088063],[-85.06206,32.132486],[-85.009224,32.181646],[-84.930727,32.21895],[-84.901191,32.258374],[-84.9338,32.29826],[-85.002791,32.322428],[-84.971831,32.442843],[-85.001532,32.514741],[-85.067199,32.579306],[-85.105437,32.644934],[-85.122326,32.774383],[-85.165635,32.808222],[-85.184737,32.870514],[-85.304439,33.482884],[-85.406748,34.002314],[-85.47045,34.328239],[-85.561416,34.750079],[-85.605165,34.984678]]]]},"properties":{"type":"Administrative","label":"Georgia","uniquelabel":"Georgia","abbreviation":"GA","geoid":"13","uniqueid":"USA-13","parentid":"","level":"1"}},{"type":"Feature","geometry":{"type":"MultiPolygon","coordinates":[[[[-88.200064,34.995634],[-88.202959,35.008028],[-87.429968,35.002791],[-86.836306,34.991899],[-86.467941,34.990486],[-85.605165,34.984678],[-85.561416,34.750079],[-85.47045,34.328239],[-85.406748,34.002314],[-85.304439,33.482884],[-85.184737,32.870514],[-85.165635,32.808222],[-85.122326,32.774383],[-85.105437,32.644934],[-85.067199,32.579306],[-85.001532,32.514741],[-84.971831,32.442843],[-85.002791,32.322428],[-84.9338,32.29826],[-84.901191,32.258374],[-84.930727,32.21895],[-85.009224,32.181646],[-85.06206,32.132486],[-85.045063,32.088063],[-85.08213,31.944658],[-85.140731,31.857461],[-85.12593,31.696265],[-85.057473,31.618624],[-85.041428,31.539293],[-85.071621,31.468384],[-85.113261,31.264343],[-85.099647,31.164942],[-85.037062,31.109753],[-85.002499,31.000685],[-85.568112,30.996244],[-86.12154,30.992884],[-86.704483,30.994668],[-87.140755,30.999532],[-87.598829,30.997455],[-87.588862,30.96579],[-87.626224,30.846664],[-87.544789,30.778395],[-87.501502,30.721092],[-87.406356,30.674437],[-87.393294,30.627218],[-87.445103,30.528909],[-87.435578,30.480496],[-87.369383,30.431948],[-87.440678,30.391498],[-87.450778,30.346999],[-87.49998,30.328957],[-87.518346,30.229506],[-87.647824,30.199211],[-87.807153,30.177378],[-88.003618,30.173417],[-88.074869,30.147149],[-88.162022,30.200093],[-88.384431,30.158543],[-88.425432,30.998323],[-88.451573,31.481531],[-88.473227,31.893856],[-88.428209,32.25103],[-88.354292,32.875131],[-88.294867,33.367103],[-88.210741,34.0292],[-88.135204,34.615878],[-88.097888,34.892202],[-88.152413,34.919741],[-88.200064,34.995634]]]]},"properties":{"type":"Administrative","label":"Alabama","uniquelabel":"Alabama","abbreviation":"AL","geoid":"01","uniqueid":"USA-01","parentid":"","level":"1"}},{"type":"Feature","geometry":{"type":"MultiPolygon","coordinates":[[[[-83.108614,35.000659],[-82.784838,35.085699],[-82.763712,35.068209],[-82.641797,35.131817],[-82.431481,35.173187],[-82.419744,35.198613],[-82.27492,35.200071],[-81.686579,35.177658],[-81.069092,35.151242],[-81.03247,35.110033],[-81.041489,35.044703],[-80.93495,35.107409],[-80.782042,34.935785],[-80.797491,34.819752],[-80.164577,34.811656],[-79.6753,34.804744],[-79.358252,34.545579],[-79.201531,34.408634],[-78.874747,34.134395],[-78.499301,33.812852],[-78.635723,33.776679],[-78.772415,33.707967],[-78.887415,33.611975],[-78.993033,33.488992],[-79.034496,33.456834],[-79.087581,33.369287],[-79.120217,33.246932],[-79.086583,33.21531],[-79.091614,33.159056],[-79.140519,33.13962],[-79.215538,33.064248],[-79.273373,33.046559],[-79.322257,32.956078],[-79.440181,32.958916],[-79.495945,32.931572],[-79.534689,32.870012],[-79.637821,32.816377],[-79.691893,32.75924],[-79.760074,32.738257],[-79.798255,32.675632],[-79.918341,32.607264],[-79.979002,32.558074],[-80.088877,32.549029],[-80.121459,32.499192],[-80.198839,32.496241],[-80.243074,32.472449],[-80.374825,32.342453],[-80.392327,32.280317],[-80.523824,32.234592],[-80.584985,32.162589],[-80.66472,32.142607],[-80.748202,32.08449],[-80.751429,32.033468],[-80.926769,32.041663],[-81.01197,32.100178],[-81.066965,32.090384],[-81.117225,32.117604],[-81.118237,32.189203],[-81.15577,32.245793],[-81.119784,32.286368],[-81.205572,32.423893],[-81.200408,32.468314],[-81.299796,32.563049],[-81.389205,32.595416],[-81.393033,32.651542],[-81.427505,32.702242],[-81.411839,32.762147],[-81.426475,32.840773],[-81.457061,32.850389],[-81.502716,32.938688],[-81.491899,33.006694],[-81.614994,33.095551],[-81.704634,33.11645],[-81.768235,33.167949],[-81.756935,33.197848],[-81.852822,33.248542],[-81.847736,33.307243],[-81.918337,33.332842],[-81.934136,33.468337],[-81.985938,33.486536],[-82.046335,33.56383],[-82.133523,33.590535],[-82.196584,33.630583],[-82.247472,33.752591],[-82.346933,33.834298],[-82.422808,33.863757],[-82.556765,33.945324],[-82.593887,34.028109],[-82.675219,34.129779],[-82.717459,34.150546],[-82.743172,34.251598],[-82.798658,34.341777],[-82.833571,34.364092],[-82.8644,34.459785],[-82.901551,34.486764],[-83.034565,34.483571],[-83.168278,34.590998],[-83.23258,34.611597],[-83.352692,34.716904],[-83.32415,34.787479],[-83.127357,34.950195],[-83.108614,35.000659]]]]},"properties":{"type":"Administrative","label":"South Carolina","uniquelabel":"South Carolina","abbreviation":"SC","geoid":"45","uniqueid":"USA-45","parentid":"","level":"1"}}]}');
//start shape layer variable
var MAShapeLayer = {
    NeedMarkerBoundingEvents: false,
    ZoomOrDragEvent: function (e)  {

        if (MAShapeLayer.NeedMarkerBoundingEvents)
        {

            $('#PlottedQueriesTable .PlottedShapeLayer').each(function () {
            	var $layer = $(this);

            	//are labels enabled?
            	var markerLabels = $layer.find('#toggle-labels').attr('checked') == 'checked';

            	if ($layer.data('labelmarkers') && markerLabels)
            	{
            	    var zoom = MA.map.getZoom();
            		var markers = $layer.data('labelmarkers');

            		for (i = 0; i < markers.length; i++)
            		{

                        var NewVisibleSetting = (zoom >= 9 && MA.map.getBounds().contains(markers[i].getPosition()));
                        var ExistingVisibleSetting = markers[i].getVisible();


                        if (NewVisibleSetting != ExistingVisibleSetting)
                        {
                            if($layer.find('#toggle-dissolve').is(':checked')) {
                            	markers[i].setVisible(true);
                            }
                            else {
                            	markers[i].setVisible(NewVisibleSetting);
                            }
                        }
                    }

            	}
            });


        }


    },
    UpdateNeedMarkerBoundingEvents: function() {
        MAShapeLayer.NeedMarkerBoundingEvents = false;

        $('#PlottedQueriesTable .PlottedShapeLayer').each(function () {
        	var $layer = $(this);

        	if ($layer.data('labelmarkers'))
        	{
        		if ($layer.data('labelmarkers').length > 500)
        		{
        			MAShapeLayer.NeedMarkerBoundingEvents = true;
        		}

        	}
        });
    },
    buildShapeActionButtons: function(options) {
        options = options || {};
        if (options.buttonSettings) {
            var result = '';

            if (MA.isMobile) {
                MAShapeLayer.buildMobileShapeActionButtons(options);
            }
            else {
                var massActionLayout = MA.getProperty(options, 'buttonSettings.massActionLayout');

                if (Array.isArray(massActionLayout)) {
                    var $shapeActionsWrappper = $('#shapeTooltipTemplates').clone().attr('id', '')
                        .find('#shapeActionsWrappper').clone().attr('id', '');

                    massActionLayout.forEach(function(section) {
                        var sectionLabel = MA.getProperty(section, 'Label') || 'Actions';

                        var $buttonSection = $($('#shapeTooltipTemplates').clone().attr('id', '')
                            .find('#buttonSection').clone().attr('id', '').html().replace('::sectionLabel::', htmlEncode(sectionLabel)));

                        var buttons = MA.getProperty(section, 'Buttons');

                        if (Array.isArray(buttons)) {
                            MA.Util.createBatchable(buttons, 3).forEach(function(buttonGroup) {
                                var $buttonsColumn = $($('#shapeTooltipTemplates').clone().attr('id', '')
                                    .find('#buttonSectionColumn').clone().attr('id', '').html());

                                if (Array.isArray(buttonGroup)) {
                                    buttonGroup.forEach(function(button) {
                                        var buttonDefinition = {};
                                        if (button.Type == 'Custom Action' && MAActionFramework.customActions[button.Label]) {
                                            $.extend(buttonDefinition, MAActionFramework.customActions[button.Label]);
                                        }
                                        else if (MAActionFramework.standardActions[button.Label]) {
                                            $.extend(buttonDefinition, MAActionFramework.standardActions[button.Label]);
                                        }
                                        var buttonLabel = htmlEncode(MA.getProperty(buttonDefinition, 'Label', false));
                                        var buttonType = MA.getProperty(button, 'Type', false);
                                        var buttonAction = htmlEncode(MA.getProperty(button,'Label', false)); // the original button contains the 'action'. => EX. Add to Trip is on the button vs the translation of 'Add to Route' on the button definition
                                        var $actionButton = $($('#shapeTooltipTemplates').clone().attr('id', '')
                                            .find('#actionButton').clone().attr('id', '').html()
                                            .replace('::layerId::', options.layerId)
                                            .replace('::action::', buttonAction || buttonLabel)
                                            .replace('::buttonLabel::', buttonLabel)
                                            .replace('::action-type::', buttonType));

                                        //  action button click handler
                                        $actionButton.attr('onclick', 'MAShapeLayer.shapeActionClick(this)');

                                        $buttonsColumn.append($actionButton);
                                    });
                                }

                                $buttonSection.find('.buttonset-section-columns').append($buttonsColumn);
                            });
                        }

                        $shapeActionsWrappper.find('.button-sections').append($buttonSection);
                    });

                    result = { markup: $shapeActionsWrappper.html() };
                }
            }

            return result;
        }
    },
    buildMobileShapeActionButtons: function(options) {
        $('#shapeActionSheet .ma-action-sheet').empty();
        $('#shapeActionsWrapper .action-bar-wrap').empty();

        // populate mobile shape tooltip actions
        var actionButtons = [];
        var massActionLayout = MA.getProperty(userSettings, 'ButtonSetSettings.massActionLayout');

        if (massActionLayout) {
            massActionLayout.forEach(function(layout) {
                actionButtons = actionButtons.concat(layout.Buttons);
            });
        }
        var actions = [];
        $.each(actionButtons,function(i,button){
            var buttonDefinition = {};
            if (button.Type == 'Custom Action' && MAActionFramework.customActions[button.Label]) {
				jQuery.extend(buttonDefinition, MAActionFramework.customActions[button.Label]);

				//disable Iframe on nearby for now
				var ActionType = MAActionFramework.customActions[button.Label].Action;
				if(MA.IsMobile && ActionType == 'Iframe') {
					return;
				}
			}
			else if (MAActionFramework.standardActions[button.Action || button.Label]) {
				if(options && options.mode == 'NearBy') {
					var modes = MAActionFramework.standardActions[button.Action || button.Label].Modes;
					if($.inArray('NearBy',modes) >= 0) {
						jQuery.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
					}
				}
				else {
					jQuery.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
				}
			}
			else {
				return;
			}
			var actButton = {
				label : buttonDefinition.Label,
				type : buttonDefinition.Type,
				action : button.Label,
				header : false,
				icon : button.icon || buttonDefinition.defaultIcon
            }
			//validate that this button meets mode requirements.  if it doesn't then disable it
			if (MA.IsMobile && jQuery.inArray('Mobile', buttonDefinition.Modes) == -1) {
				actButton['disabled'] = true;
				//ActionsArr.push(actButton);
				return;
			}

			//validate that this button meets render type requirements
			if (buttonDefinition.RenderModes && jQuery.inArray(options.markerType, buttonDefinition.RenderModes) == -1 && buttonDefinition.Label != MASystem.Labels.ActionFramework_Set_Verified_Location) {
				actButton['disabled'] = true;
				//return false;
			}

			if(!actButton.disabled) {
				actions.push(actButton);
			}

			if(actions.length < 4) {
                var $customButton = $('<button class="action-bar-button actionbutton"></button>');

                var $label = $('<span>' + buttonDefinition.Label + '</span>');

                $customButton.attr('data-action', button.Action || button.Label);
                $customButton.attr('data-action-type', buttonDefinition.Type);
                $customButton.attr('data-layerid', options.layerId);
                $customButton.attr('data-type', options.Type);
                $customButton.attr('data-marker', 'record');

                var $icon = $('<div></div>');
                var icon = MA.getProperty(MAActionFramework, ['standardActions', button.Label, 'defaultIcon']) || MA.getProperty(MAActionFramework, ['customActions', button.Label, 'defaultIcon']) || 'ma-icon-solution';
                $icon.addClass(['ma-icon', icon].join(' '));
                $customButton.append($icon);
                $customButton.append($label);

                $customButton.click(function() { MAShapeLayer.shapeActionClick(this); });

                $('#shapeActionsWrapper .action-bar-wrap').append($customButton);
			} else {
				if(actions.length == 5) {
					var hamburgerMenuMarkup = '<button class="action-bar-button open-marker-action-sheet open-action-sheet" action-sheet="shapeActionSheet">' +
					'<div class="ma-icon ma-icon-threedots-vertical"></div>' +
					'</button>';

					$('#shapeActionsWrapper .action-bar-wrap').append($(hamburgerMenuMarkup));
				}

				var $customButton = $('<div class="ma-action-sheet-item actionbutton">' + buttonDefinition.Label + '</div>');

				$customButton.attr('data-action', button.Action || button.Label);
				$customButton.attr('data-action-type', buttonDefinition.Type);
				$customButton.attr('data-layerid', options.layerId);
				$customButton.attr('data-type', options.Type);
				$customButton.attr('data-marker', 'record');

				$customButton.click(function() { MAShapeLayer.shapeActionClick(this); });

				$('#shapeActionSheet .ma-action-sheet').append($customButton);

			}
        });
		 $('#shapeActionSheet').data('actionOptions', $.extend(options.options, {
            geometry: options.geometry
        }));


    },
    shapeActionClick: function(target) {
        var action = $(target).attr('data-action');
        var actionType = $(target).attr('data-action-type');
        var actionOptions = $('#shapeInfoPopup').data('massActionInfo');

        if (actionOptions) {
            if (actionOptions.type === 'cluster') {
                massActionClick(action, actionType, actionOptions);
            } else {
                var options = {
                    shape: {
                        geometry: actionOptions.geometry
                    }
                };
                massActionShapeClick(actionOptions.target, action, actionType, options);
            }
        } else {
            MAToastMessages.showWarning({message: MASystem.Labels.Layers_No_Action_Available, subMessage: MASystem.Labels.Layers_No_Markers_Support_This_Action, timeOut: 10000});
            console.warn('Action options for this shape action not found');
        }
    },
    saveShape: function(options) {
        var $dfd = $.Deferred();

        options = options || {};

        if (MA.isMobile) {
            var shapeLayerName = MA.getProperty(options, 'shapeLayerName');
            var shapeLayerDescription = MA.getProperty(options, 'shapeLayerDescription');
            var folderId = MA.getProperty(options, 'folderId');
            var shapeInfo = MA.getProperty(options, 'shapeInfo');

            // for Personal Folder, set the User Id to save folder for
            var userId = folderId == 'PersonalRoot' ? MA.getProperty(MA, 'CurrentUser.Id') : null;

            // handle PersonalRoot and Corporate Root folder selections
            if (folderId === 'PersonalRoot') {
                folderId = null;
                userId = MA.getProperty(MA, 'CurrentUser.Id');
            } else if (folderId === 'CorporateRoot') {
                folderId = null;
                userId = null;
            }

            var isDrawnShape = MA.getProperty(options, 'shapeInfo.custom');

            if (isDrawnShape) {
                var shape = MA.getProperty(shapeInfo, 'shape');

                var colorOpts = {
                    fillColor: "#22CC22",
                    borderColor: "#000000",
                    fillOpacity: "0.2",
                    labelEnabled: false,
                    labelOverride: "",
                    labelJustification: "center",
                    labelFontSize: "10px",
                    labelFontColor:"#FFFFFF",
                    labelBGColor: "#000000",
                    labelBGOpacity: "0.3"
                };

                var territoryOptions = {
                    country: 'USA',
                    advancedOptions: {
                        calculateTerritoryAggregates: false,
                        dissolveGeometry: true
                    },
                    colorOptions: colorOpts
                };

                var points = [];

                shape.getPath().getArray().forEach(function(point) {
                    points.push(point.toJSON());
                });

                var shapeData = {
                    proximityType: 'Polygon',
                    isCustom: true,
                    points: points
                };

                var territory = {
                    Id: null,
                    Name: shapeLayerName,
                    maps__Description__c: shapeLayerDescription,
                    maps__User__c : userId || null,
                    maps__Folder__c : folderId || null,
                    maps__Options__c : JSON.stringify(territoryOptions),
                    maps__CustomGeometry__c : true
                };

                var serializedGeometry = {
                    Name : shapeLayerName + '-geometry',
                    maps__Geometry__c : JSON.stringify(shapeData)
                };

                var processData = {
                    action: 'saveBoundaryInfo',
                    ajaxResource: 'TerritoryAJAXResources',
                    serializedTerritory: JSON.stringify(territory),
                    serializedGeometry: JSON.stringify(serializedGeometry)
                };

                // Save shape layer
                Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest, processData, function(res, event) {
                    if (event.status) {
                        if (res && res.success) {
                            $dfd.resolve(res);
                        } else {
                            $dfd.reject(res);
                        }
                    } else {
                        $dfd.reject({ message: 'Remote call error', error: event });
                    }
                });
            } else {
                $dfd.reject('Save shape function currently only supports saving custom drawn shapes');
            }
        } else {
            $dfd.reject('Save shape function currently only supports mobile');
        }

        return $dfd.promise();
    }
} //End MAShapeLayer Object

var MACustomShapes = {
    openPopupSidebar : function (options) {
        options = $.extend({
            isParcel : false,
            isKML : false,
            id : '',
            isClone: false
        },options || {});
        VueEventBus.$bus.$emit('open-modal', { modal: 'create-custom-shape', options: options});
    },

    updateShapeGeometry : function (options,callback) {
        callback = callback || function(){};
        var shape = options.shape;
        var $layer = options.layer;
        var dataId = $layer.attr('data-id');
        var shapeData = {};
        if(typeof(shape.getCenter) == 'function') {
            //circle
            //get the center
            var center = shape.getCenter();

            shapeData = {
                proximityType : 'Circle',
                center : { lat : center.lat(), lng : center.lng()},
                radius : shape.getRadius(),
                isCustom : true
            }
        }
        else if(typeof(shape.getPath) == 'function') {
            //poly
            var tempData = {
                proximityType : 'Polygon',
                points : [],
                isCustom : true
            }

            //loop over the points to get the lat lng
            var points = shape.getPath();
            for (var i =0; i < points.getLength(); i++) {
                var xy = points.getAt(i);
                tempData.points.push({lat: xy.lat(), lng: xy.lng()})
            }

            shapeData = tempData;
            tempData = null;
        }
        else if(typeof(shape.getBounds) == 'function') {
            //rectangle
            var tempData = {
                proximityType : 'Rectangle',
                bounds : {},
                isCustom : true
            }

            //get the bounds
            var bounds = shape.getBounds();
            var NE = bounds.getNorthEast();
            var SW = bounds.getSouthWest();
            tempData.bounds = {
                NE : {lat : NE.lat(), lng : NE.lng()},
                SW : {lat : SW.lat(), lng : SW.lng()}
            }

            shapeData = tempData;

        }

        var mainShapeInfo = $layer.data('popupData') || {};
        var processData = {
            ajaxResource : 'TerritoryAJAXResources',

            action: 'saveGeometryInfo',
            geometry        : JSON.stringify(shapeData),
            geometryName    : (mainShapeInfo.name || 'custom') + '-geometry',
            territory       : $layer.data('id'),
            removeOldGeo    : true
        };

        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            processData,
            function(res, event){
                if(event.status) {
                    $('#PlottedQueriesTable .PlottedShapeLayer[data-id="'+dataId+'"]').each(function() {
                        var $layer = $(this);
                        $layer.find('.refresh-shape').click();
                    });
                    callback(res);
                }
                else {
                    callback(res);
                }
            },
			{escape:false}
        );
    },

    createLabel : function (geoInfo,options,shape,name) {
        /*var labelMarker = new google.maps.Marker({
            position: new google.maps.LatLng(33.8792120807938, -80.8650508760346),
            map: MA.map,
            icon: ImageMarkerURL + '&text=' + encodeURIComponent('South Carolina'),
            clickable: false
        }));*/
        var type = geoInfo.proximityType;

        var ImageMarkerURL = getProperty(MASystem, 'Organization.MAIO_URL', false)
		    + '/images/labels/2?fontcolor='
			+ encodeURIComponent(options.labelFontColor)
			+ '&bgcolor=' + encodeURIComponent(options.labelBGColor)
            + '&bgopacity=' + encodeURIComponent(options.labelBGOpacity)
            + '&fontsize=' + encodeURIComponent(options.labelFontSize);

        var labelText = options.labelOverride == '' ? name : options.labelOverride;

        var marker = new google.maps.Marker({
            icon: ImageMarkerURL + '&text=' + encodeURIComponent(labelText),
            clickable: false,
            map: MA.map,
            visible: false
        });

        if (type == 'Polygon' || type == 'travelTime' || type == 'travelDistance' || shape.hasOwnProperty('customShape_multiple')) {
            var bounds = new google.maps.LatLngBounds();
            if (shape.hasOwnProperty('customShape_multiple')) {
                function processPoints(geometry, callback, thisArg) {
                    if (geometry instanceof google.maps.LatLng) {
                        callback.call(thisArg, geometry);
                    }
                    else if (geometry instanceof google.maps.Data.Point) {
                        callback.call(thisArg, geometry.get());
                    }
                    else {
                        geometry.getArray().forEach(function(g) { processPoints(g, callback, thisArg); });
                    }
                }
                shape.forEach(function (feature) {
                    processPoints(feature.getGeometry(), bounds.extend, bounds);
                });
            } else {
                var path = shape.getPath();
                var pointsArr = path.getArray();

                for(i=0; i < pointsArr.length; i++) {
                    var point = pointsArr[i];
                    bounds.extend(point);
                }
            }
            var center = bounds.getCenter();
            var NE = bounds.getNorthEast();
            var SW = bounds.getSouthWest();
            if(options.labelJustification == 'right') {
                marker.setPosition(new google.maps.LatLng(center.lat(),NE.lng()));
            }
            else if(options.labelJustification == 'center') {
                marker.setPosition(center);
            }
            else if(options.labelJustification == 'left') {

                marker.setPosition(new google.maps.LatLng(center.lat(),SW.lng()));
            }
        }
        else if(type == 'Circle') {
            var center = shape.getCenter();
            var bounds = shape.getBounds();
            var NE = bounds.getNorthEast();
            var SW = bounds.getSouthWest();
            if(options.labelJustification == 'right') {
                marker.setPosition(new google.maps.LatLng(center.lat(),NE.lng()));
            }
            else if(options.labelJustification == 'center') {
                marker.setPosition(center);
            }
            else if(options.labelJustification == 'left') {
                marker.setPosition(new google.maps.LatLng(center.lat(),SW.lng()));
            }
        }
        else if (type == 'Rectangle') {
            var bounds = shape.getBounds();
            var center = bounds.getCenter();
            var NE = bounds.getNorthEast();
            var SW = bounds.getSouthWest();
            if(options.labelJustification == 'right') {

                marker.setPosition(new google.maps.LatLng(center.lat(),NE.lng()));
            }
            else if(options.labelJustification == 'center') {
                marker.setPosition(center);
            }
            else if(options.labelJustification == 'left') {
                marker.setPosition(new google.maps.LatLng(center.lat(),SW.lng()));
            }

        }
        else {

        }

        return marker;
    },

    drawV2 : function (options) {
        var dfd = $.Deferred();
        //add custom shape to options and create shapelayer
        options = $.extend({
            customShape : true,
            enableEdit : false
        }, options || {});

        MA_DrawShapes.init(options).then(function(){
            dfd.resolve();
        }).fail(function(err) {
            dfd.reject();
        });
        return dfd.promise();
    }

}

/**This function is meant to send out the process and postbody data then using the return populate the
 * available options select list.
 */

function CustomShapeLayerUpdatePreview() {
    var LayerFillColor = $('#custom-shapelayer-shape-fill-color-input').val();
    var LayerFillOpacity = $('#custom-shapelayer-shape-fill-opacity-input').val();
    var LayerStrokeColor = $('#custom-shapelayer-border-fill-color-input').val();

    var labelEnabled        = $('#custom-shapelayer-label-enabled').is(':checked');
    var labelOverride       = $('#custom-shapelayer-label-override').val();
    var labelJustification  = $('#custom-shapelayer-label-justification').val();
    var labelFontSize       = $('#custom-shapelayer-label-font-size').val();
    var labelFontColor      = $('#custom-shapelayer-label-font-color').val();
    var labelBGColor        = $('#custom-shapelayer-label-bg-color').val();
    var labelBGOpacity      = $('#custom-shapelayer-label-bg-opacity').val();

    try { CustomShapeLayerBuilderPreviewShapeManager.setMap(null); } catch (e) {}

    CustomShapeLayerBuilderPreviewShapeManager = new google.maps.Circle({
        map: CustomShapeMap,
        strokeColor: LayerStrokeColor,
        strokeWeight: 2,
        fillColor: LayerFillColor,
        fillOpacity: LayerFillOpacity,
        center : new google.maps.LatLng(33.7849179687286,-84.5168525242187),
        radius : 300500
     });

     //Remove existing labels, if they exists
    if (CustomShapeLayerBuilderPreviewMarkerArray.length > 0)
    {
        for (var i = 0; i < CustomShapeLayerBuilderPreviewMarkerArray.length; i++)
        {
            CustomShapeLayerBuilderPreviewMarkerArray[i].setMap(null);
        }

        CustomShapeLayerBuilderPreviewMarkerArray = [];
    }
    if (labelEnabled)
    {

        var ImageMarkerURL = getProperty(MASystem, 'Organization.MAIO_URL', false)
		    + '/images/labels/2?fontcolor='
			+ encodeURIComponent(labelFontColor)
			+ '&bgcolor=' + encodeURIComponent(labelBGColor)
            + '&bgopacity=' + encodeURIComponent(labelBGOpacity)
            + '&fontsize=' + encodeURIComponent(labelFontSize);

        if (labelJustification == 'left')
        {
            CustomShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                position: new google.maps.LatLng(33.7849179687286, -87.76530009886727),
                map: CustomShapeMap,
                icon: ImageMarkerURL + '&text=' + encodeURIComponent('Left'),
                clickable: false
            }));
        }
        else if (labelJustification == 'center')
        {
            CustomShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                position: new google.maps.LatLng(33.7849179687286, -84.51685252421873),
                map: CustomShapeMap,
                icon: ImageMarkerURL + '&text=' + encodeURIComponent('Center'),
                clickable: false
            }));
        }
        else if (labelJustification == 'right')
        {
            CustomShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                position: new google.maps.LatLng(33.7849179687286, -81.2684049495702),
                map: CustomShapeMap,
                icon: ImageMarkerURL + '&text=' + encodeURIComponent('Right'),
                clickable: false
            }));
        }

    }
}

function ShapeLayerUpdatePreview()
{
    var LayerFillColor = $('#shapelayer-shape-fill-color-input').val();
    var LayerFillOpacity = $('#shapelayer-shape-fill-opacity-input').val();
    var LayerStrokeColor = $('#shapelayer-border-fill-color-input').val();

    var labelEnabled        = $('#shapelayer-label-enabled').is(':checked');
    var labelOverride       = $('#shapelayer-label-override').val();
    var labelJustification  = $('#shapelayer-label-justification').val();
    var labelFontSize       = $('#shapelayer-label-font-size').val();
    var labelFontColor      = $('#shapelayer-label-font-color').val();
    var labelBGColor        = $('#shapelayer-label-bg-color').val();
    var labelBGOpacity      = $('#shapelayer-label-bg-opacity').val();

    var currentlyDissolved = false;

    var dissolveGeometry = $('#CreateTerritoryPopup .dissolve-geometry').is(':checked');



    try { ShapeLayerBuilderPreviewShapeManager.setMap(null); } catch (e) {}



    ShapeLayerBuilderPreviewShapeManager = new google.maps.Data({
        map: ShapeLayerPreviewMap,
        style: {
            strokeColor: LayerStrokeColor,
            strokeWeight: 2,
            fillColor: LayerFillColor,
            fillOpacity: LayerFillOpacity
        }
     });

    if (dissolveGeometry)
    {
        ShapeLayerBuilderPreviewShapeManager.addGeoJson(SEStatesDissolved);
    }
    else
    {
        ShapeLayerBuilderPreviewShapeManager.addGeoJson(SEStatesNotDissolved);
    }


    //ShapeLayerBuilderPreviewMarkerArray



    //Make the labels

    //Remove existing labels, if they exists
    if (ShapeLayerBuilderPreviewMarkerArray.length > 0)
    {
        for (var i = 0; i < ShapeLayerBuilderPreviewMarkerArray.length; i++)
        {
            ShapeLayerBuilderPreviewMarkerArray[i].setMap(null);
        }

        ShapeLayerBuilderPreviewMarkerArray = [];
    }
    if (labelEnabled)
    {

        var ImageMarkerURL = getProperty(MASystem, 'Organization.MAIO_URL', false)
		    + '/images/labels/2?fontcolor='
			+ encodeURIComponent(labelFontColor)
			+ '&bgcolor=' + encodeURIComponent(labelBGColor)
            + '&bgopacity=' + encodeURIComponent(labelBGOpacity)
            + '&fontsize=' + encodeURIComponent(labelFontSize);

        if (dissolveGeometry)
        {
            if (labelJustification == 'left')
            {
                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(29.7997095, -88.473227),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Southeast States'),
                    clickable: false
                }));
            }
            else if (labelJustification == 'center')
            {
                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(31.5986396505468, -83.5993269907065),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Southeast States'),
                    clickable: false
                }));
            }
            else if (labelJustification == 'right')
            {
                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(29.7997095, -78.499301),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Southeast States'),
                    clickable: false
                }));
            }

        }
        else
        {
            if (labelJustification == 'left')
            {
                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(27.7000165, -87.626224),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Florida'),
                    clickable: false
                }));


                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(32.6793865, -85.605165),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Georgia'),
                    clickable: false
                }));


                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(32.5775885, -88.473227),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Alabama'),
                    clickable: false
                }));


                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(33.6167695, -83.352692),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('South Carolina'),
                    clickable: false
                }));
            }
            else if (labelJustification == 'center')
            {
                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(28.4781928961719, -82.4655539344436),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Florida'),
                    clickable: false
                }));


                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(32.6381648759795, -83.4273761548062),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Georgia'),
                    clickable: false
                }));


                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(32.7567898557329, -86.8448359458974),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Alabama'),
                    clickable: false
                }));


                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(33.8792120807938, -80.8650508760346),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('South Carolina'),
                    clickable: false
                }));
            }
            else if (labelJustification == 'right')
            {
                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(27.7000165, -79.975425),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Florida'),
                    clickable: false
                }));


                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(32.6793865, -80.751429),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Georgia'),
                    clickable: false
                }));


                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(32.5775885, -84.901191),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('Alabama'),
                    clickable: false
                }));


                ShapeLayerBuilderPreviewMarkerArray.push(new google.maps.Marker({
                    position: new google.maps.LatLng(33.6167695, -78.499301),
                    map: ShapeLayerPreviewMap,
                    icon: ImageMarkerURL + '&text=' + encodeURIComponent('South Carolina'),
                    clickable: false
                }));

            }

        }



    }


}


$(function () {
	//remove shapeLayer on close button click
	$('#PlottedQueriesContainer .PlottedShapeLayer').on('click', '.btn-remove', function() {

		$('.PlottedShapeLayer').data('dataLayer').setMap(null);
	});
});

/***********************************
* Support Functions
***********************************/


function showHideShapeLayer ($proxLayer, visible) {
	var map = visible == true ? MA.map : null;
	try { $proxLayer.data('dataLayer').setMap(map); } catch (err) {}
	if(visible) {
	    //this will show all things in the kml (can be different that want was initialy plotted)
	    try { $proxLayer.data('kmlLayer').showDocument(); } catch (err) {}

	    //this block will simply refresh the kml and show what was initiall plotted
	    //uncomment this if we get complaints...
	    /*
    	    $proxLayer.find('.refresh-shape').click();
    	    $proxLayer.find('.shape-visibility .glyphicon').removeClass('ma-icon-hide').addClass('ma-icon-preview');
	    */
	}
	else {
        try { $proxLayer.data('kmlLayer').hideDocument(); } catch (err) {}
	}
    try { $proxLayer.data('proxObject').setMap(map); } catch (err) {}
    try { $.each($proxLayer.data('proxObjects'), function (i, proxObject) { proxObject.setMap(map); }); } catch (err) {}
    // Merge/Unmerge boundaries if changed when shape layer is hidden
    $proxLayer.find('#toggle-dissolve').trigger('change');
    //check if show labels is checked
    var toggleLabelsChecked = $proxLayer.find('#toggle-labels').is(':checked');
    if(toggleLabelsChecked) {
	    try
	    {
	        if ($proxLayer.data('labelmarkers'))
	        {
	            var markers = $proxLayer.data('labelmarkers');
	            for (var i = 0; i < markers.length; i++)
	            {
	                markers[i].setVisible(visible);
	            }
	        }
	    }
		catch (err) {}
   	}

    if(visible == true) {
    	//update the icon
    	$proxLayer.find('.ma-icon-hide').removeClass('ma-icon-hide').addClass('ma-icon-preview');
     }
     else {
     	$proxLayer.find('.ma-icon-preview').removeClass('ma-icon-preview').addClass('ma-icon-hide');
     }
}

function showHideShapeLabels ($proxLayer, visible) {
	try
    {
        if ($proxLayer.data('labelmarkers'))
        {
        	var markers = $proxLayer.data('labelmarkers');
        	if(!visible) {
	            for (var i = 0; i < markers.length; i++)
	            {
	                markers[i].setVisible(visible);
	            }
        	}
        	else {
	        	if(MA.map.getZoom() < 9 && markers.length > 500) {
	        		return;
	        	}
	        	else {
		            var markers = $proxLayer.data('labelmarkers');
		            var length = markers.length > 500 ? 500 : markers.length;
		            for (var i = 0; i < length; i++)
		            {
		                markers[i].setVisible(visible);
		            }
		        }
		    }
        }
    }
    catch (err) {}
}

function addShapeClickEvents(shape) {
    google.maps.event.addListener(shape, 'click', function (e) {
        proximityLayer_Click({ position: e.latLng, type: 'polygon', shape: shape });
    });
    google.maps.event.addListener(shape, 'rightclick', function (e) {
        Shape_Context.call(this, e);
    });
}


var MA_DrawShapes = {
    getCountryData: function() {
        var dfd = $.Deferred();
        var countryKeys = Object.keys(MA.TM.countries);
        if (countryKeys.length) {
            // already have the data, skip
            dfd.resolve();
        } else {
            var urlPath = '/boundary/overlays/2';


            // this var is used in 1-2 places but since this is legacy I'm taking path of least damage.
            // removing old cloudbilt call and replacing with MAIO (Security P1 issue)
            MA.TM.countries = {}; // var is update in response below

            Visualforce.remoting.Manager.invokeAction(MARemoting.getFromHyperforceGISService,
                urlPath,{},
                function(res, event) {
                    //done saving analytics
                    if(event.status){
                        if(res && res.success) {
                            var optionsString = ''
                            var overlays = getProperty(res,'data.overlays',false) || [];
                            for (var i = 0; i < overlays.length; i++) {
                                var country = overlays[i] || {};
                                var countryId = country.id;
                                var legacyId = country.id;
                                var label = country.label;
                                var levels = country.levels;
                                var zipImport = country.zip_supported || false;
                                // handle legacy global object
                                if (label === 'Custom') {
                                    legacyId = 'CUS'
                                }
                                var levelLength = levels.length;
                                var levelMap = {};
                                for (var l = 0; l < levelLength; l++) {
                                    var level = levels[l];
                                    levelMap[level.id] = level;
                                }
                                MA.TM.countries[legacyId] = {
                                    label: label,
                                    adminLevels: levelMap
                                };
                            }

                        }
                    }
                    dfd.resolve();
                }
            );
        }
        return dfd.promise();
    },
    init: function(options) {
        var dfd = $.Deferred();

        // make sure we have the options needed
        options = $.extend({
            id: '',
            refresh : false,
            isParcel : false,
            dataLayers : {},
            customShape : null,
            enableEdit : false,
            folderPath : ''
        }, options || {});
        // recent folder updates
        MA_DrawShapes.storeAnalytics(options.id);
        // create or grab shape layer (update or new)
        MA_DrawShapes.createLayerInfo(options).then(function(shapeLayerRef) {
            var $shapeLayer = $(shapeLayerRef);

            if (MA.isMobile) {
                VueEventBus.$emit('change-tab', 'layers');
                VueEventBus.$emit('update-layer-tab', 'tabLayersActive');
            } else {
                VueEventBus.$emit('move-to-tab', 'plotted');
            }
            // update popup data based on shape below
            var popupData = {
                description: '',
                modifiedBy: 'N/A',
                createdBy: 'N/A',
                name: ''
            };
            MA_DrawShapes.updatePopupData($shapeLayer, options);
            // plot shape
            var isCustom = true;
            if (options.isParcel) {
                var propertyid = '';
                if (options.propertyid != undefined) {
                    propertyid = options.propertyid;
                } else if (options.uid != undefined) {
                    propertyid = options.uid;
                }
                popupData = {
                    description: 'Property ID: ' + propertyid,
                    modifiedBy: 'N/A',
                    createdBy: 'N/A',
                    name: options.label || ''
                };
                MA_DrawShapes.updatePopupData($shapeLayer, popupData);
                MA_DrawShapes.parcelHelpers.getParcelInfo(options).then(function(shapeData) {
                    MA_DrawShapes.parcelHelpers.updateDomInfo($shapeLayer, options);
                    MA_DrawShapes.parcelHelpers.drawParcelLayer(options, shapeData, $shapeLayer);
                    MA_DrawShapes.finalizeLayer($shapeLayer);
                    dfd.resolve({layer:$shapeLayer});
                }).fail(function(err) {
                    $shapeLayer.find('.adminlevels').css('display','inline-block').text('Unable to find parcel information');
                    $shapeLayer.find('.basicinfo-name').text(options.label || 'Parcel Layer');
                    MA_DrawShapes.finalizeLayer($shapeLayer);
                    dfd.reject({layer:$shapeLayer,error:err});
                });
            } else if (options.customShape) {
                // get data from SFDC
                MA_DrawShapes.customShapeHelpers.getLayerInfo(options.id).then(function(shapeInfo) {
                    MA_DrawShapes.customShapeHelpers.updateDomInfo($shapeLayer, options, shapeInfo.territory);
                    MA_DrawShapes.customShapeHelpers.processShapes(shapeInfo, $shapeLayer, options).then(function() {
                        dfd.resolve({layer:$shapeLayer});
                    }).fail(function(err) {
                        dfd.reject({layer:$shapeLayer,error:err});
                    }).always(function() {
                        popupData = {
                            description: getProperty(shapeInfo, 'territory.maps__Description__c', false) || 'N/A',
                            modifiedBy: (getProperty(shapeInfo, 'territory.LastModifiedBy.Name', false) || 'N/A') + ', ' + (getProperty(shapeInfo, 'territory.LastModifiedDate', false) || ''),
                            createdBy: (getProperty(shapeInfo, 'territory.CreatedBy.Name', false) || 'N/A') + ', ' + (getProperty(shapeInfo, 'territory.CreatedDate', false) || ''),
                            name: getProperty(shapeInfo, 'territory.Name', false) || ''
                        };
                        MA_DrawShapes.updatePopupData($shapeLayer, popupData);
                        $shapeLayer.find('.adminlevels').css('display','inline-block');
                        $shapeLayer.find('.zipinfo').show();
                        $shapeLayer.find('.countyinfo').show();
                        $shapeLayer.find('.stateinfo').show();
                        MA_DrawShapes.finalizeLayer($shapeLayer);
                    });
                }).fail(function(err) {
                    console.warn(err);
                    MA_DrawShapes.finalizeLayer($shapeLayer);
                    dfd.reject({layer:$shapeLayer,error:err});
                });
            } else if (options.custom) {
                if (options.shape && MA.isMobile) {
                    var proxObjects = $shapeLayer.data('proxObjects');
                    $shapeLayer.data('custom', true);
                    $shapeLayer.find('[action="plot-shape"]').removeAttr('onclick');
                    proxObjects.push(options.shape);
                    var qid = $shapeLayer.attr('qid');
                    MA_DrawShapes.updatePopupData($shapeLayer, popupData);
                    MA_DrawShapes.finalizeLayer($shapeLayer);
                    dfd.resolve({layer:$shapeLayer});
                } else {
                    dfd.reject({layer:$shapeLayer,error:err});
                }
            } else {
                isCustom = false;
                //send request for territory info
                var processData = {
                    ajaxResource : 'TerritoryAJAXResources',
                    action: 'getTerritory',
                    id: options.id
                };

                // make sure we have shape data
                MA_DrawShapes.getCountryData().always(function () {

                    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                        processData,
                        function(response, event){
                            if (response.securityError) {
                                window.MAToastMessages.showError({
                                    message: window.MASystem.Labels.MA_Error,
                                    subMessage: response.message,
                                    timeout: 10000,
                                    closeButton: true
                                });
                                MA_DrawShapes.finalizeLayer($shapeLayer);
                            } else if(event.status && response.success) {
                                var data = getProperty(response, 'data', false);
                                var territoryData = getProperty(response, 'data.territory', false);
                                //removeNamespace(MASystem.MergeFields.NameSpace, response.data.territory.ShapeLayerGeometries__r.records[0]);
                                $shapeLayer.addClass('maTerritory');
                                popupData.description = territoryData.maps__Description__c || 'No description.';
                                popupData.modifiedBy = (territoryData.LastModifiedBy != null ? territoryData.LastModifiedBy.Name + ', ' : 'N/A, ') + territoryData.LastModifiedDate;
                                popupData.createdBy = (territoryData.CreatedBy != null ? territoryData.CreatedBy.Name + ', ' : 'N/A, ') + territoryData.CreatedDate;
                                popupData.name = territoryData.Name;
                                var plottedObj = Plotting.plottedIds[options.id];
                                plottedObj = $.extend(plottedObj,popupData);
                                $shapeLayer.attr('data-id',territoryData.Id);
                                //add label to territory
                                var territoryName = territoryData.Name;
                                var territoryDescription = (territoryData.maps__Description__c != null) ? territoryData.maps__Description__c : 'N/A';
                                $('#CreateTerritoryPopup .territory-name').val(territoryName);
                                $('#CreateTerritoryPopup .territory-description').val(territoryDescription);

                                //grab colors
                                var Options = JSON.parse(territoryData.maps__Options__c);

                                var country = Options.country || 'USA';
                                popupData.country = country;
                                var fillColor = Options.colorOptions.fillColor;
                                var borderColor = Options.colorOptions.borderColor;
                                var fillOpacity = Options.colorOptions.fillOpacity || 0.2;

                                var labelEnabled        = Options.colorOptions.labelEnabled        || false;
                                var labelOverride       = Options.colorOptions.labelOverride       || '';
                                var labelJustification  = Options.colorOptions.labelJustification  || 'center';
                                var labelFontSize       = Options.colorOptions.labelFontSize       || '10px';
                                var labelFontColor      = Options.colorOptions.labelFontColor      || '#FFFFFF';
                                var labelBGColor        = Options.colorOptions.labelBGColor        || '#000000';
                                var labelBGOpacity      = Options.colorOptions.labelBGOpacity      || '0.2';

                                var numBoundaries = 0;

                                if(options.refresh) {
                                    labelEnabled = options.showLabels;
                                }

                                //grab advanced options
                                var advancedOptions = $.extend({
                                    calculateTerritoryAggregates: false,
                                    dissolveGeometry: false
                                }, Options.advancedOptions);

                                //build shape Layer Wrapper
                                //$shapeLayer.data('calculateTerritoryAggregates', advancedOptions.calculateTerritoryAggregates);
                                $shapeLayer.find('.basicinfo-name').text(territoryName);
                                var rgb = hexToRgb(fillColor);

                                //build array for all territories

                                var boundaryRequest = 0;
                                var allBoundaries = [];
                                $shapeLayer.find('.adminlevels').empty();
                                var geomRecs = territoryData.maps__ShapeLayerGeometries__r.records;
                                var boundaryMap = {}; // map of label to number
                                $.each(geomRecs, function(recIndex,geomRec){
                                    var geometry = geomRec.maps__Geometry__c || '{}';
                                    var geometry2 = geomRec.maps__Geometry2__c || '';
                                    var geometry3 = geomRec.maps__Geometry3__c || '';
                                    var geometry4 = geomRec.maps__Geometry4__c || '';
                                    var geometry5 = geomRec.maps__Geometry5__c || '';
                                    var geometry6 = geomRec.maps__Geometry6__c || '';
                                    var geometry7 = geomRec.maps__Geometry7__c || '';
                                    var geometry8 = geomRec.maps__Geometry8__c || '';
                                    var geometry9 = geomRec.maps__Geometry9__c || '';
                                    var geometry10 = geomRec.maps__Geometry10__c || '';

                                    //combine geometry fields
                                    var combinedGeometry = JSON.parse(geometry + geometry2 + geometry3 + geometry4 + geometry5 + geometry6 + geometry7 + geometry8 + geometry9 + geometry10);
                                    $.each(combinedGeometry, function (adminLevel, boundaries) {
                                        //legacy support for old admin level keys
                                        if (adminLevel.toLowerCase() == 'states') { adminLevel = '1'; }
                                        else if (adminLevel.toLowerCase() == 'counties') { adminLevel = '2'; }
                                        else if (adminLevel.toLowerCase() == 'zips') { adminLevel = '4'; }

                                        //legacy support for old county ids
                                        if (country == 'USA' && adminLevel == '2') {
                                            $.each(boundaries, function (index, boundary) {
                                                if (boundary.indexOf('USA-2-') == 0) {
                                                    allBoundaries.push(boundary);
                                                }
                                                else {
                                                    allBoundaries.push('USA-2-' + boundary.substring(4));
                                                }
                                                try {
                                                    country = boundary.split('-')[0].toUpperCase();
                                                    var MATMCountries = MA.TM.countries[country] || { adminLevels: {} };
                                                    var adminLevelMetadata = MATMCountries.adminLevels || {};
                                                    var thisLevel = adminLevelMetadata[adminLevel] || {};
                                                    var levelLabel = thisLevel.label_plural;
                                                    if (!boundaryMap[levelLabel]) {
                                                        boundaryMap[levelLabel] = 0;
                                                    }
                                                    boundaryMap[levelLabel]++;
                                                } catch (e) {
                                                    if (!boundaryMap.Boundary) {
                                                        boundaryMap.Boundary = 0;
                                                    }
                                                    boundaryMap.Boundary++;
                                                }
                                            });
                                        }
                                        else {
                                            //Case 00024001 (DB had spaces in names at some point, removing them here)
                                            //allBoundaries = allBoundaries.concat(boundaries);
                                            $.each(boundaries, function (index, boundary) {
                                                //reduce all spaces to a single space then replace space with underscore
                                                boundary = boundary.replace(/ +(?= )/g,'').replace(/ /g,"_");
                                                allBoundaries.push(boundary);
                                                try {
                                                    country = boundary.substring(0,3).toUpperCase();
                                                    var MATMCountries = MA.TM.countries[country] || { adminLevels: {} };
                                                    var adminLevelMetadata = MATMCountries.adminLevels || {};
                                                    var thisLevel = adminLevelMetadata[adminLevel] || {};
                                                    var levelLabel = thisLevel.label_plural;
                                                    if (!boundaryMap[levelLabel]) {
                                                        boundaryMap[levelLabel] = 0;
                                                    }
                                                    boundaryMap[levelLabel]++;
                                                } catch (e) {
                                                    if (!boundaryMap.Boundary) {
                                                        boundaryMap.Boundary = 0;
                                                    }
                                                    boundaryMap.Boundary++;
                                                }
                                            });
                                        }
                                        popupData.geometry = allBoundaries;
                                    });
                                });
                                var boundaryKeys = Object.keys(boundaryMap);
                                var boundaryLength = boundaryKeys.length;
                                for (var b = 0; b < boundaryLength; b++) {
                                    var boundaryLabel = boundaryKeys[b] === 'undefined' ? window.MASystem.Labels.Other_Boundaries : boundaryKeys[b];
                                    var total = boundaryMap[boundaryKeys[b]];
                                    $shapeLayer.find('.adminlevels').append($("<div style='color:#A0A0A0;'></div>").text(boundaryLabel + ': ' + total));
                                }


                                //show info for selected geometry
                                $shapeLayer.find('.basicinfo-totalGeometry, .basicinfo-type').text(window.formatLabel(MASystem.Labels.Layers_On_The_Map_Plotted_Shape_Layer_Boundaries ,[allBoundaries.length]));

                                numBoundaries = allBoundaries.length;

                                //create a data layer for this shape layer that will store the features
                                var style = { strokeColor: borderColor, strokeWeight: 2, fillColor: fillColor, fillOpacity: fillOpacity, layer: $shapeLayer, layerType: 'prox', label: '', proxType: advancedOptions.dissolveGeometry ? null : $shapeLayer.find('.basicinfo-name').text() };
                                var hoverStyle = $.extend({}, style, { fillColor: '#000' });
                                var dataLayer = new google.maps.Data({
                                    map: MA.map,
                                    style: style
                                });
                                $shapeLayer.data('dataLayer', dataLayer);
                                var dissolve = (options.toggleDissolve === true || options.toggleDissolve === false) ? options.toggleDissolve : advancedOptions.dissolveGeometry;
                                //add event handlers
                                dataLayer.addListener('click', function(e) {
                                    proximityLayer_Click({
                                        position: e.latLng,
                                        type: 'data',
                                        feature: e.feature,
                                        dissolve: dissolve,
                                        territoryId: MA.getProperty(territoryData, 'Id')
                                    });
                                });
                                dataLayer.addListener('rightclick', function (e) { Shape_Context.call(e.feature, e); });
                                dataLayer.addListener('mouseover', function (e) { this.overrideStyle(e.feature, hoverStyle); });
                                dataLayer.addListener('mouseout', function (e) { this.revertStyle(e.feature); });

                                var dissolveGeo = advancedOptions.dissolveGeometry;
                                if(options.toggleDissolve != null) {
                                    //update the dissolve options
                                    dissolveGeo = options.toggleDissolve;
                                }

                                //loop over geometry and batch results
                                var shapeCountMap = {};
                                if (dissolveGeo)
                                {
                                    // MERGED GEOMETRY
                                    boundaryRequest = 1;

                                    $shapeLayer.find('#toggle-dissolve').attr('checked','checked');
                                    $shapeLayer.find('.adminlevels').hide();
                                    $shapeLayer.find('.plottinginfo-wrapper .inline').eq(1).text('Merging...');

                                    // check for merged geoJSON in S3
                                    (function checkMergeStatus(jobId) {
                                        Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequest, { subType: 'geometry', action: 'merge', version: '2' }, { 'job_id': jobId }, function(mergeResponse, event) {
                                            // job status for merged geometry
                                            var jobStatus;
                                            if (mergeResponse.success && mergeResponse.data.data) {
                                                jobStatus = mergeResponse.data.data.status;
                                            }

                                            if (jobStatus == 'completed') {
                                                // url for merged geometry in S3
                                                var presignedURL = (mergeResponse.data.data.url || '').replace(/&amp;/g, '&');
                                                window.axios.get(presignedURL).then(function (mergedShape) {
                                                    // geoJSON
                                                    $shapeLayer.data('dataLayer').addGeoJson(mergedShape.data);

                                                    // KML
                                                    var kmlInfo = $shapeLayer.data('kmlInfo') || [];
                                                    kmlInfo.push(mergedShape.data);
                                                    $shapeLayer.data('kmlInfo', kmlInfo);

                                                    // labels
                                                    var labelPosition = mergedShape.data.properties.label_position;
                                                    var labelLat = getProperty(labelPosition, labelJustification + '.lat', false);
                                                    var labelLng = getProperty(labelPosition, labelJustification + '.lng', false);
                                                    var mergeLabel = {
                                                        lat: labelLat,
                                                        lng: labelLng,
                                                        text: labelOverride == '' ? territoryName : labelOverride
                                                    }

                                                    if ($shapeLayer.data('labels') == undefined) {
                                                        $shapeLayer.data('labels', []);
                                                    }
                                                    var shapeLabels = $shapeLayer.data('labels');
                                                    shapeLabels.push(mergeLabel);

                                                    $shapeLayer.data('labels', shapeLabels);

                                                    $shapeLayer.find('.plottinginfo-wrapper .inline').eq(1).text('');
                                                    $shapeLayer.find('.adminlevels').show();
                                                    boundaryRequest = 0;
                                                }).catch(function () {
                                                    // user cancelled plotting this shape layer
                                                    $shapeLayer.find('.plottinginfo-wrapper .inline').eq(1).text('');
                                                    $shapeLayer.find('.adminlevels').show();
                                                    boundaryRequest = 0;
                                                });
                                            } else if (jobStatus == 'failed') {
                                                // unable to process and merge these geometries
                                                $shapeLayer.find('.plottinginfo-wrapper .inline').eq(1).text('');
                                                $shapeLayer.find('.adminlevels').show();
                                                MAToastMessages.showError({
                                                    message: MASystem.Labels.Layers_Merge_Error,
                                                    subMessage: MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin,
                                                    closeButton: true,
                                                    timeOut: 10000
                                                });
                                                boundaryRequest = 0;
                                            } else if (jobStatus == 'in_progress') {
                                                setTimeout(function(){checkMergeStatus(jobId)}, 5000);
                                            } else {
                                                var geoIdString = JSON.stringify(allBoundaries);
                                                var geoIdStringSplit = geoIdString.match(/.{1,100000}/g);
                                                if (geoIdStringSplit.length > 10) {
                                                    //geometry is too big to store
                                                    $shapeLayer.find('.plottinginfo-wrapper .inline').eq(1).text('');
                                                    $shapeLayer.find('.adminlevels').show();
                                                    MAToastMessages.showError({
                                                        message: MASystem.Labels.Layers_Merge_Error,
                                                        subMessage: MASystem.Labels.Layers_Remove_Boundaries_Try_Again,
                                                        closeButton: true,
                                                        timeOut: 10000
                                                    });
                                                    boundaryRequest = 0;
                                                } else {
                                                    // merged shape has expired (deleted from S3 after 90 days) => merge again
                                                    startMergeJob(allBoundaries).then(function (newJobResp) {

                                                        var mergeJobId = '';
                                                        if (newJobResp.data.data) {
                                                            mergeJobId = newJobResp.data.data.job_id;
                                                        }

                                                        var processData = {
                                                            ajaxResource : 'TerritoryAJAXResources',
                                                            action: 'updateMergeJobId',
                                                            territoryId: territoryData.Id,
                                                            jobId: mergeJobId
                                                        };

                                                        //update shape layer with new its new job id
                                                        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest, processData, function(response,event){
                                                            if(event.status) {
                                                                if (!response.success) {
                                                                    $shapeLayer.find('.plottinginfo-wrapper .inline').eq(1).text('');
                                                                    $shapeLayer.find('.adminlevels').show();
                                                                    MAToastMessages.showError({
                                                                        message: MASystem.Labels.Layers_Merge_Error,
                                                                        subMessage: MASystem.Labels.Layers_Remove_Boundaries_Try_Again,
                                                                        closeButton: true,
                                                                        timeOut: 10000
                                                                    });
                                                                    boundaryRequest = 0;
                                                                } else {
                                                                    //check merge status using new job id
                                                                    setTimeout(function(){checkMergeStatus(mergeJobId)}, 5000);
                                                                }
                                                            }
                                                        });
                                                    }).catch(function (err) {
                                                        $shapeLayer.find('.plottinginfo-wrapper .inline').eq(1).text('');
                                                        $shapeLayer.find('.adminlevels').show();
                                                        MAToastMessages.showError({
                                                            message: MASystem.Labels.Layers_Merge_Error,
                                                            subMessage: MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin,
                                                            closeButton: true,
                                                            timeOut: 10000
                                                        });
                                                        boundaryRequest = 0;
                                                    })
                                                }
                                            }
                                        });
                                    })(territoryData.maps__JobId__c || '');
                                }
                                else
                                {
                                    var q =  async.queue(function (options, callback) {
                                        boundaryRequest++;
                                        //grab data using geoJSON
                                        GetDataFromServer({
                                            data: options,
                                            layer: $shapeLayer
                                        }).then(function(res) {
                                            if(res.success){
                                                var geomLabels = getProperty(res,'geomLabels') || [];
                                                $.each(geomLabels,function(k,v)
                                                {
                                                    var previousCount = shapeCountMap[v.label] || 0;
                                                    var newCount = previousCount + v.count;
                                                    shapeCountMap[v.label] = newCount;
                                                });
                                            }
                                            callback();
                                        });
                                    });

                                    q.concurrency = 5;

                                    q.drain = function(){
                                        boundaryRequest = 0;
                                    };

                                    while(allBoundaries.length > 0) {
                                        //original batch size was 5 at a time, upping for speed increase
                                        var boundariesBatch = allBoundaries.splice(0,10);
                                        q.push({
                                            APIKey	: MA.APIKey,
                                            country	: country,
                                            ids		: boundariesBatch,
                                            labelEnabled    : true,
                                            labelOverride   : labelOverride,
                                            labelposition   : labelJustification,
                                            labelFontSize   : labelFontSize,
                                            labelFontColor  : labelFontColor,
                                            labelBGColor    : labelBGColor,
                                            labelBGOpacity  : labelBGOpacity
                                        },function(){});
                                    }
                                }

                                //set an interval to wait for completion
                                var interval = setInterval(function () {
                                    if(boundaryRequest == 0) {
                                        //callback({success:true});
                                        MA_DrawShapes.updatePopupData($shapeLayer, popupData);
                                        MA_DrawShapes.finalizeLayer($shapeLayer);
                                        clearInterval(interval);
                                        $.each(shapeCountMap, function(label,count) {
                                            var innerEl = $shapeLayer.find('.adminLevels div');
                                            if (!innerEl) {
                                                $shapeLayer.find('.adminlevels').append($("<div style='color:#A0A0A0;'></div>").text(label + ': ' +count));
                                            }
                                        });

                                        //remove loading mask and show results
                                        $shapeLayer.find('.status').remove();
                                        $shapeLayer.find('.adminlevels').css('display','inline-block');
                                        $shapeLayer.find('.zipinfo').show();
                                        $shapeLayer.find('.countyinfo').show();
                                        $shapeLayer.find('.stateinfo').show();
                                        $shapeLayer.removeClass('loading');
                                        $shapeLayer.find('.svg-shape-icon').show();
                                        $shapeLayer.find('.loading-icon').hide();
                                        $shapeLayer.find('.loadMask').hide();
                                        var qid = $shapeLayer.attr('qid');

                                        //if the shape layer is supposed to default to visible in shape then we need handle that
                                        $shapeLayer.find('.affectvisibility').prop('checked',advancedOptions.affectVisibility);
                                        if(advancedOptions.affectVisibility) {
                                            ChangeVisibilityWhenCircleIsAdded({force:true,keepRelatedShapes:true});
                                        }
                                        //add metadata to each feature that can be used during click events
                                        dataLayer.forEach(function (feature) {
                                            feature.maData = { dataLayer: dataLayer };
                                            feature.label = territoryName;

                                            //add qid to feature for listview
                                            feature.qid = qid;

                                            feature.forEachProperty(function (val, prop) {
                                                feature.maData[prop] = val;
                                            });
                                        });

                                        //if labels are enabled, plot them
                                        //always create marker, show hide in menu
                                        if (true)
                                        {
                                            var labelArray = $shapeLayer.data('labels') || [];

                                            if (labelArray.length > 500)
                                            {
                                                MAShapeLayer.NeedMarkerBoundingEvents = true;
                                            }


                                            var markers = [];

                                            var ImageMarkerURL = getProperty(MASystem, 'Organization.MAIO_URL', false)
                                            + '/images/labels/2?fontcolor='
                                            + encodeURIComponent(labelFontColor)
                                            + '&bgcolor=' + encodeURIComponent(labelBGColor)
                                            + '&bgopacity=' + encodeURIComponent(labelBGOpacity)
                                            + '&fontsize=' + encodeURIComponent(labelFontSize);

                                            $.each( labelArray, function( index, value ) {

                                                var markerPosition = new google.maps.LatLng(parseFloat(value.lat),parseFloat(value.lng));
                                                var markerVisible = false;

                                                //check if this is a refresh and labels have been enabled
                                                if(options.refresh && options.showLabels) {
                                                    labelEnabled = true;
                                                }

                                                if (labelArray.length > 500)
                                                {
                                                    //Check the zoom level, we only want to show markers (when above 500) when we are zoomed in close enough
                                                    if (MA.map.getZoom() >= 9)
                                                    {
                                                        //Check if the marker is in view or not, if not let's not show it
                                                        if (MA.map.getBounds().contains(markerPosition) && labelEnabled)
                                                        {
                                                            markerVisible = true;
                                                        }
                                                    }
                                                    if (labelEnabled) {
                                                        $shapeLayer.find('#toggle-labels').attr('checked','checked');
                                                    }
                                                }
                                                else
                                                {
                                                    if(labelEnabled) {
                                                        markerVisible = true;
                                                        //update the checkbox on the shapelayer
                                                        $shapeLayer.find('#toggle-labels').attr('checked','checked');
                                                    }
                                                }

                                                var markerText = value.text;
                                                //MAP-752: single boundary non-merged shapes would not display a label
                                                var isCurrentlyDissolved = options.toggleDissolve || false;
                                                if ( (isCurrentlyDissolved || numBoundaries === 1 ) && labelOverride != undefined && labelOverride != '' && labelOverride.replace(/ /g,'').length > 0 ) {
                                                    markerText = labelOverride;
                                                    //markerText = value.text;
                                                }

                                                markerIcon = new google.maps.Marker({
                                                    position: markerPosition,
                                                    map: MA.map,
                                                    icon: ImageMarkerURL + '&text=' + encodeURIComponent(markerText),
                                                    clickable: false,
                                                    visible: markerVisible
                                                });
                                                markers.push(markerIcon);

                                            });
                                            $shapeLayer.data('labelmarkers',markers);

                                        }
                                        dfd.resolve({layer:$shapeLayer});
                                    }
                                }, 100);
                            }
                        },
                        {escape:false}
                    );
                });
            }
            options.isCustom = isCustom;
            // last pieces
            MA_DrawShapes.addMainClickEvents(options, $shapeLayer);
        });
        return dfd.promise();
    },
    storeAnalytics: function (layerId) {
        trackUsage('Maps', { action: 'Plot Shape Layer', description: 'Plotting shape layers' });
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            {
                ajaxResource : 'TreeAJAXResources',
                action: 'store_layer_analytics',
                track : 'true',
                subtype : 'Shape Layer',
                id : layerId
            },
            function(res, event){
                if(event.status)
                {
                    if(NewLayerNavigationEnabled()) {
                        VueEventBus.$emit('get-recent-layers');
                    }
                }
            },{buffer:false, timeout: 40000}
        );
    },
    createLayerInfo: function (options) {
        var dfd = $.Deferred();
        if (!options.qid) {
            var qid = Math.floor(Math.random() * 1000000) + 'shapeprox';
            options.qid = qid;
        }
        Plotting.plottedIds[options.id] = options;
        var plottedObj = Plotting.plottedIds[options.id];
        plottedObj['type'] = 'shape';
        var $shapeLayer;
        if(options.refresh == true) {
            $shapeLayer = options.shapeLayer;
            $shapeLayer.removeData();
            $shapeLayer.data('proxObjects', []);
            //reset checkboxes to default
            $shapeLayer.find('#hide-shape').attr('checked',true);
            $shapeLayer.find('#toggle-dissolve, #toggle-labels').removeAttr('checked');
            MA_DrawShapes.appendingDataToShapeLayer($shapeLayer, options);
            dfd.resolve($shapeLayer);
        }
        else {
            options.component = 'ShapeLayer';
            window.VueEventBus.$emit('add-layer', options, function(shapeLayerRef) {
                $shapeLayer = $(shapeLayerRef);
                $shapeLayer.data({
                    proxObjects: [],
                    calculateTerritoryAggregates: false
                });
                MA_DrawShapes.appendingDataToShapeLayer($shapeLayer, options);
                dfd.resolve($shapeLayer);
            });
        }
        return dfd.promise();
    },
    appendingDataToShapeLayer: function ($shapeLayer, options) {
        $shapeLayer.data('editable', options.modify);
        $shapeLayer.data('isParcel', options.isParcel);
        $shapeLayer.data('folderPath', options.folderPath);
        $shapeLayer.addClass('loading');
        if (!MA.isMobile) {
            $shapeLayer.find('.ftu-icon-left').hide();
            $shapeLayer.find('.loading-icon').show();
        }
        $shapeLayer.find('.status').text(MASystem.Labels.MA_Loading_With_Ellipsis);
        //do we have the proximity radius stuff?
        var invertProx = getProperty(userSettings || {}, 'InvertProximity', false) || false;
        var shapeText = invertProx ? 'Only show markers outside shape' : MASystem.Labels.LayersTab_Shape_Display_OnlyShowMarkersInside;
        $shapeLayer.find('.proximityText').text(shapeText);
        $shapeLayer.data('qid', options.qid);
        $shapeLayer.attr('qid', options.qid);
    },
    updatePopupData: function ($shapeLayer, additionalInfo) {
        var popupData = {
            description: additionalInfo.description || '',
            modifiedBy: additionalInfo.modifiedBy || '',
            createdBy: additionalInfo.createdBy || '',
            name: additionalInfo.name || ''
        };
        $shapeLayer.data('popupData', popupData);
    },
    addMainClickEvents: function (options, $shapeLayer) {
        if(options.refresh != true) {
            $shapeLayer.on('click','.refresh-shape',function(event) {
                $shapeLayer.find('.svg-shape-icon').hide();
                $shapeLayer.find('.loading-icon').show();
                var qid = $shapeLayer.data('qid');
                //unrender shape
                unrenderThis($shapeLayer);

                var op = {
                    ...options,
                    ...{
                        shapeLayer : $shapeLayer,
                        id : options.id,
                        refresh : true,
                        customShape : options.isCustom,
                        qid: qid
                    }
                };

                MA_DrawShapes.init(op);
            });
            $shapeLayer.on('change','#toggle-dissolve',function(event) {
                var mergeBoundariesChecked = event.target.checked;
                var showLabelsChecked = $shapeLayer.find('#toggle-labels').is(':checked');
                var isVisibleChecked = $shapeLayer.find('#hide-shape').is(':checked');
                // Wait until shape layer is visible before doing boundary merge/unmerge
                if (isVisibleChecked) {
                    //unrender shape
                    $shapeLayer.find('.svg-shape-icon').hide();
                    $shapeLayer.find('.loading-icon').show();
                    unrenderThis($shapeLayer);
                    var op = {
                        shapeLayer : $shapeLayer,
                        id : options.id,
                        toggleDissolve : mergeBoundariesChecked,
                        showLabels : showLabelsChecked,
                        refresh : true,
                        qid: $shapeLayer.attr('qid')
                    };
                    MA_DrawShapes.init(op);
                    $shapeLayer.find('#toggle-dissolve').prop('checked', mergeBoundariesChecked);
                    $shapeLayer.find('#toggle-labels').prop('checked', showLabelsChecked);
            }
            });
            function unrenderThis ($proxLayer) {
                try { $proxLayer.data('dataLayer').setMap(null); } catch (err) {}
                try { $proxLayer.data('kmlLayer').hideDocument(); } catch (err) {}
                try { $proxLayer.data('proxObject').centerPoint.setMap(null); } catch (err) {} // remove the centerPoint marker for boundaries that may have a centerPoint on it.
                try { $proxLayer.data('proxObject').setMap(null); } catch (err) {}
                try { $.each($proxLayer.data('proxObjects'), function (i, proxObject) { try{proxObject.centerPoint.setMap(null);}catch(e){} proxObject.setMap(null); }); } catch (err) {}
                try
                {
                    if ($proxLayer.data('labelmarkers'))
                    {
                        var markers = $proxLayer.data('labelmarkers');

                        for (var i = 0; i < markers.length; i++)
                        {
                            markers[i].setMap(null);
                        }
                    }
                }
                catch (err) {}
                //check if show labels is checked
                if($proxLayer.find('#toggle-labels').attr('checked') == 'checked') {
                    try
                    {
                        if ($proxLayer.data('labelmarkers'))
                        {
                            var markers = $proxLayer.data('labelmarkers');

                            for (var i = 0; i < markers.length; i++)
                            {
                                markers[i].setVisible(false);
                            }
                        }
                    }
                    catch (err) {}
                }
            }

            //set clicks and mouse events on the correct elements if it's a parcel
            var dropDownElement = '.drop-menu-wrapper';
            if(options.isParcel) {
                dropDownElement += '.shape-options';
            }

            $shapeLayer.on('mouseenter',dropDownElement, function(event) {
                var $button = $(this);
                var menuItemPos = $button.position();
                //get position to show menu
                var topPos = menuItemPos.top + 25; //+25px for button size
                if($button.is('.shape-visibility')){
                    $shapeLayer.find('.shape-menu-visibility').css('top',topPos);
                    $shapeLayer.find('.plotted-visibile-icon, .shape-menu-visibility').addClass('active');
                }
                else if ($button.is('.shape-options')) {
                    $shapeLayer.find('.shape-menu-options').css('top',topPos);
                    $shapeLayer.find('.plotted-menu-icon, .shape-menu-options').addClass('active');
                }

                var $menu = $button.find('.drop-down-menu');
                var menuOff = $menu.offset();
                var menuHeight = $menu.height();
                //check the menu height and offset
                var totalMenu = menuOff.top + menuHeight;

                //get the map dimensions
                var $container = $('#mapcontainer');
                var containerOff = $container.offset();
                var containerHeight = $container.height();
                var containerTotal = containerOff.top + containerHeight;

                //appears offscreen
                if(totalMenu >= containerTotal) {
                    //place the menu on the bottom of the container
                    topPos = menuItemPos.top - menuHeight;
                    $menu.css('top',topPos);
                }
            });

            $shapeLayer.on('mouseleave',dropDownElement, function(event) {
                $('.drop-down-menu, .btn-lg').removeClass('active');
            });

            $shapeLayer.on('click', '.fit-shape', function () {
                var bounds = new google.maps.LatLngBounds();
                //shape layers
                function processPoints(geometry, callback, thisArg) {
                    if (geometry instanceof google.maps.LatLng) {
                        callback.call(thisArg, geometry);
                    }
                    else if (geometry instanceof google.maps.Data.Point) {
                        callback.call(thisArg, geometry.get());
                    }
                    else {
                        geometry.getArray().forEach(function(g) { processPoints(g, callback, thisArg); });
                    }
                }

                if(options.isParcel) {

                    try {
                        $shapeLayer.data('proxObjects').forEach(function (proxObj) {
                            proxObj.forEach(function (feature) {
                                processPoints(feature.getGeometry(), bounds.extend, bounds);

                                MA.map.fitBounds(bounds);
                            });
                        });
                    }
                    catch (err) { MA.log('Unable to include data layer in zoom to fit calculation', err); }

                } else if(options.customShape) {

                    try {
                        //kml
                        var kmlShape = $shapeLayer.data('kmlLayer');

                        var kmlDocs = kmlShape.docs || [];
                        for(var k = 0, kLen = kmlDocs.length; k < kLen; k++) {
                            var kmlDoc = kmlDocs[k];
                            var kmlBounds = kmlDoc.bounds;
                            bounds.union(kmlBounds);
                        }

                        MA.map.fitBounds(bounds);
                    }
                    catch(e){}

                    try {
                        if ($shapeLayer.data('customShape_multiple')) {
                            $shapeLayer.data('proxObjects').forEach(function (proxObj) {
                                proxObj.forEach(function (feature) {
                                    processPoints(feature.getGeometry(), bounds.extend, bounds);

                                    MA.map.fitBounds(bounds);
                                });
                            });
                        } else {
                            $shapeLayer.data('proxObjects').forEach(function (shape) {
                                try {
                                    //circle/rectangle
                                    var bound = shape.getBounds();
                                    bounds.union(bound);
                                }
                                catch (e) {
                                    //polygon
                                    var path = shape.getPath();
                                    var arr = path.getArray();
                                    for(i=0; i < arr.length; i++) {
                                        var point = arr[i];
                                        var latlng = new google.maps.LatLng(point.lat(),point.lng());
                                        bounds.extend(latlng);
                                    }
                                }
                            });

                            MA.map.fitBounds(bounds);
                        }
                    }
                    catch (err) { MA.log('Unable to include data layer in zoom to fit calculation', err); }

                } else {

                    try {
                        $shapeLayer.data('dataLayer').forEach(function (feature) {
                            processPoints(feature.getGeometry(), bounds.extend, bounds);

                            MA.map.fitBounds(bounds);
                        });
                    }
                    catch (err) { MA.log('Unable to include data layer in zoom to fit calculation', err); }

                }
            });

            //show hide shape layer on change event
            $shapeLayer.on('change','#hide-shape', function(event) {
                var checked = event.target.checked;
                showHideShapeLayer($shapeLayer,checked);
            });

            //show hide shape layer label(s) on change event
            $shapeLayer.on('change','#toggle-labels', function(event) {
                if($shapeLayer.find('#hide-shape').is(':checked')) {
                    var checked = event.target.checked;
                    showHideShapeLabels($shapeLayer,checked);
                }
            });

            if(!MASystem.User.IsCorporateAdmin && !options.modify) {
                $shapeLayer.find('.edit-shape').remove();
            }
            else {
                $shapeLayer.on('click','.edit-shape',function(event) {
                    var qid = $shapeLayer.data('qid');
                    if($shapeLayer.attr('data-type') === 'KML') {
                        MACustomShapes.openPopupSidebar({
                            id: options.id,
                            savedKML: true,
                            isPlotted: true,
                            qid: qid
                        });
                    }
                    if(options.customShape) {
                        //open popup
                        var qid = $shapeLayer.data('qid');
                        MACustomShapes.openPopupSidebar({
                            id: options.id,
                            isPlotted: true,
                            qid: qid
                        });
                    }
                    else {
                        window.VueEventBus.$bus.$emit('open-modal', {
                            modal: 'shape-builder-modal',
                            options: {
                                id: options.id,
                                plotted: true,
                                qid: qid
                            }
                        });
                    }
                });
            }

            $shapeLayer.prependTo('#PlottedQueriesTable');
        }
    },
    finalizeLayer: function ($shapeLayer) {
        $shapeLayer.find('.status').remove();
        $shapeLayer.removeClass('loading');
        if (MA.isMobile) {
            $shapeLayer.find('.queryLoader').hide();
            $shapeLayer.find('.queryIcon').show();
        } else {
            $shapeLayer.find('.ftu-icon-left').show();
            $shapeLayer.find('.loading-icon').hide();
        }
        $shapeLayer.find('.loadMask').hide();
    },
    parcelHelpers: {
        getParcelInfo: function (options) {
            var dfdParcel = $.Deferred();
            var parcelOptions = {
                method : 'get',
                action: 'parcel',
                subType : 'data',
                version : '2'
            };
            var fipscode = '';
            if (options.fipscode !== undefined) {
                fipscode = options.fipscode;
            } else if(typeof options.parcel == 'string') {
                //legacy support,split on _ to get fips code
                var parcelParts = options.parcel.split('_');
                if (parcelParts.length == 2) {
                    fipscode = parcelParts[1];
                } else {
                    fipscode = options.parcel;
                }
            }
            var propertyid = '';
            if (options.propertyid != undefined) {
                propertyid = options.propertyid;
            } else if (options.uid != undefined) {
                propertyid = options.uid;
            }
            var params = {
                'propertyid' : propertyid,
                'fipscode' : fipscode
            }
            Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequest,
                parcelOptions,
                params,
                function(res, event){
                    //MAToastMessages.hideMessage($mobileLoadingMessage);
                    if(event.status) {
                        if(res && res.success) {
                            var shapeData = res.data || {};
                            dfdParcel.resolve(shapeData);
                        } else {
                            console.warn('Unable to get parcel info', res);
                            dfdParcel.reject('Unable to get parcel info. Please contact support if this issue persists.');
                        }
                    } else {
                        console.warn('Unable to get parcel info', event);
                        dfdParcel.reject(event.message);
                    }
                }
            );
            return dfdParcel.promise();
        },
        updateDomInfo: function ($shapeLayer, options) {
            if(!options.isSavedParcel) {
                //let's add a save option to side bar
                $shapeLayer.find('.shape-menu-options').append('<li class="drop-menu-item item-selectable saveDataLayerShape" role="presentation"><a role="menuitem">Save Shape</a></li>');
                $shapeLayer.attr('data-id', options.uid);
            }
            else {
                var $html = $('<li class="drop-menu-item item-selectable editDataLayerShape" role="presentation"><a role="menuitem">Edit</a></li>');
                $html.insertBefore($shapeLayer.find('.fit-shape'));
                $shapeLayer.attr('data-id', options.id);
                options.layerUID = '';
            }
            $shapeLayer.addClass('dmpLayer');
            $shapeLayer.data('hidden', false);
            //add labels
            $shapeLayer.find('.basicinfo-name').text(options.label || 'Parcel Layer');
            $shapeLayer.find('.adminlevels').empty();
            $shapeLayer.find('.adminlevels').append($("<div style='color:#A0A0A0;'></div>").text('Shapes: 1 ' + 'Polygon'));
            $shapeLayer.find('.basicinfo-totalGeometry, .basicinfo-type').text(1 + ' ' + MASystem.Labels.MA_Boundary);

            //store this shapeLayer on it's originating query
            $shapeLayer.attr('data-layerId',options.layerUID);
            $shapeLayer.find('.adminlevels').css('display','inline-block');
            $shapeLayer.find('.zipinfo').show();
            $shapeLayer.find('.countyinfo').show();
            $shapeLayer.find('.stateinfo').show();
            $shapeLayer.find('.shape-visibility button span').removeClass('glyphicon').addClass('MAIcon');
            $shapeLayer.find('.shape-options').find('li.edit-shape').remove();
            $shapeLayer.find('.shape-options').find('li.refresh-shape').remove();
            MA_DrawShapes.parcelHelpers.attachClickEvents(options, $shapeLayer);
            MA_DrawShapes.parcelHelpers.syncDataLayerAndShape(options, $shapeLayer);
        },
        syncDataLayerAndShape: function (options, $shapeLayer) {
            // track shape layer and data layer to remove on data layer removal
            var $dataLayer = $('#PlottedQueriesTable .DataLayer[uid="'+options.layerUID+'"]');
            var parcelBoundaries = $dataLayer.data('parcelBoundaries') || [];
            parcelBoundaries.push($shapeLayer);
            $dataLayer.data('parcelBoundaries',parcelBoundaries);
        },
        attachClickEvents: function (options, $shapeLayer) {
            $shapeLayer.off('click','.shape-visibility');
            $shapeLayer.on('click','.shape-visibility', function() {
                if($shapeLayer.data('hidden')) {
                    $(this).find('span').removeClass('ma-icon-hide').addClass('ma-icon-preview');
                    var parcel = $shapeLayer.data('proxObjects')[0];
                    MA.map.data.add(parcel[0]);
                    $shapeLayer.data('hidden', false);
                } else {
                    $(this).find('span').removeClass('ma-icon-preview').addClass('ma-icon-hide');
                    var shapeData = $shapeLayer.data() || {};
                    var parcels = shapeData.proxObjects || [];
                    $.each(parcels,function(i,parcel) {
                        try {
                            MA.map.data.remove(parcel[0]);
                        } catch(e) {
                            console.warn(e);
                        }
                    });
                    $shapeLayer.data('hidden', true);
                }
            });
            if (!options.isSavedParcel) {
                $shapeLayer.on('click','.saveDataLayerShape',function() {
                    MACustomShapes.openPopupSidebar(options);
                });
            } else {
                $shapeLayer.on('click','.editDataLayerShape',function() {
                    MACustomShapes.openPopupSidebar({
                        id: options.id,
                        qid: $shapeLayer.attr('qid')
                    });
                })
            }
        },
        drawParcelLayer: function (options, shapeData, $shapeLayer) {
            var styleOptions = {};
            if(options.colorOptions) {
                    styleOptions = {
                    fillColor : options.colorOptions.fillColor || '#000000',
                    strokeColor : options.colorOptions.borderColor || '#000000',
                    fillOpacity : options.colorOptions.fillOpacity || '0.2'
                }
            }
            var $dataLayer = $('#PlottedQueriesTable .DataLayer[uid="'+options.layerUID+'"]');
            shapeData.features[0].properties = { parcel: options.parcel, uid: options.uid, key: $dataLayer.data('key'), styleOptions : styleOptions};
            var arr = MA.map.data.addGeoJson(shapeData);
            var shape = arr;
            var proxObjects = $shapeLayer.data('proxObjects');
            proxObjects.push(shape);
        }
    },
    customShapeHelpers: {
        getLayerInfo: function (layerId) {
            var dfdInfo = jQuery.Deferred();
            var processData = {
                ajaxResource : 'TerritoryAJAXResources',
                action: 'getTerritory',
                id: layerId
            };
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                processData,
                function(response,event){
                    if (event.status) {
                        if (response && response.securityError) {
                            dfdInfo.reject(response.message);
                        }else if (response && response.success) {
                            dfdInfo.resolve(response.data || {});
                        } else {
                            dfdInfo.reject('Unable to get shape info. If this issue persists, please contact support.');
                        }
                    } else {
                        dfdInfo.reject(event.message);
                    }
                }, {escape:false, buffer: false}
            );

            return dfdInfo.promise();
        },
        updateDomInfo: function ($shapeLayer, options, shapeInfo) {
            $shapeLayer.data('territoryData',shapeInfo);
            $shapeLayer.attr('data-id',shapeInfo.Id);
            $shapeLayer.find('.adminlevels').empty();
            var $territoryIcon = '<div class="ftu-icon-icon inline" type="shape"></div>';
            $shapeLayer.find('.color-box').replaceWith($territoryIcon);
            $shapeLayer.find('.svg-shape-icon').hide();
            var territoryName = shapeInfo.Name;
            var territoryDescription = (shapeInfo.Description__c == null) ? '' : shapeInfo.Description__c;
            $shapeLayer.find('.basicinfo-name').text(territoryName);
        },
        processShapes: function (shapeInfo, $shapeLayer, options) {
            var dfd = $.Deferred();
            var territory = shapeInfo.territory || {};
            var geometries = territory.maps__ShapeLayerGeometries__r || {};
            // are we plotting 1 shape or multiple?
            if (geometries.totalSize === 0) {
                console.warn('No custom shapes found');
                dfd.reject('No geometries found for this layer.');
            } else if (geometries.totalSize === 1) {
                MA_DrawShapes.customShapeHelpers.drawSingleShape(geometries, territory, $shapeLayer, options).then(function () {
                    dfd.resolve();
                }).fail(function(err) {
                    console.warn(err);
                    dfd.reject(err);
                });
            } else {
                $shapeLayer.data('customShape_multiple', true);
                MA_DrawShapes.customShapeHelpers.drawMultipleShapes(geometries, territory, $shapeLayer, options).then(function () {
                    dfd.resolve();
                }).fail(function(err) {
                    console.warn(err);
                    dfd.reject(err);
                });
            }
            return dfd.promise();
        },
        generateGeoJSONCircle: function (center, radius, numSides) {
            var points = [],
            degreeStep = 360 / numSides;

            for(var i = 0; i < numSides; i++){
                var gpos = google.maps.geometry.spherical.computeOffset(center, radius, degreeStep * i);
                points.push({lng:gpos.lng(), lat:gpos.lat()});
            };
            // Duplicate the last point to close the geojson ring
            points.push(points[0]);
            return {
                type: 'Polygon',
                coordinates: points
            };
        },
        drawMultipleShapes: function (geometries, territory, $shapeLayer, options) {
            var dfd = $.Deferred();
            // treak multiple shapes as geo json
            geometries = geometries.records;
            var googleJSONLayer = new google.maps.Data({
                map: MA.map,
                customShape_multiple: true
            });
            // try to set the color
            try {
                var colorOptions = MA_DrawShapes.customShapeHelpers.getColorOptions(territory);
                // translate border color to stroke color
                colorOptions.strokeColor = colorOptions.borderColor || '#000000';
                googleJSONLayer.setStyle(colorOptions)
            } catch(e) {
                console.warn('Unable to set style/colors', e);
            }
            var shapeCount = {
                Circle : 0,
                Polygon : 0,
                Rectangle : 0,
                KML : 0,
                Travel : 0
            };
            for(var sL = 0, len = geometries.length; sL < len; sL++) {
                var geometry = geometries[sL];
                var jsonGeo;
                try {
                    jsonGeo = JSON.parse(geometry.maps__Geometry__c);
                } catch (e) {}
                if (jsonGeo) {
                    jsonGeo['colorOptions'] = MA_DrawShapes.customShapeHelpers.getColorOptions(territory);
                    // plot shape
                    var shapeType = jsonGeo.proximityType ?? '';
                    shapeType = shapeType.toLowerCase();
                    var enableEdit = options.enableEdit || false;
                    var shape;
                    switch (shapeType) {
                        case 'polygon':
                            shapeCount.Polygon++;
                            shape = MA_DrawShapes.customShapeHelpers.drawPolygon(jsonGeo, $shapeLayer, territory, 'geoJSON');
                            break;
                        case 'circle':
                            shapeCount.Circle++;
                            shape = MA_DrawShapes.customShapeHelpers.drawCircle(jsonGeo, $shapeLayer, territory, 'geoJSON');
                            break;
                        case 'rectangle':
                            shapeCount.Rectangle++;
                            shape = MA_DrawShapes.customShapeHelpers.drawRectangle(jsonGeo, $shapeLayer, territory, 'geoJSON');
                            break;
                        default:
                            console.warn('Contains '+shapeType+' Layer. This Layer type is not supported.');
                    }
                    if (shape) {
                        googleJSONLayer.add(shape);
                    }
                } else {
                    console.warn('Unable to parse shape options', geometry);
                }
            }
            dfd.resolve();
            MA_DrawShapes.customShapeHelpers.buildShapeCountInfo(shapeCount, $shapeLayer);
            var proxObjects = $shapeLayer.data('proxObjects');
            addShapeClickEvents(googleJSONLayer);
            proxObjects.push(googleJSONLayer);
            MA_DrawShapes.customShapeHelpers.createLabelMarker(jsonGeo,googleJSONLayer,territory,$shapeLayer);
            return dfd.promise();
        },
        getColorOptions: function (territory) {
            var terrOpts = {"country":"USA","advancedOptions":{"calculateTerritoryAggregates":false,"dissolveGeometry":true},"colorOptions":{"fillColor":"#3083D3","borderColor":"#16325C","fillOpacity":"0.2","labelEnabled":false,"labelOverride":"","labelJustification":"center","labelFontSize":"10px","labelFontColor":"#FFFFFF","labelBGColor":"#000000","labelBGOpacity":"0.3"}};
            try {
                terrOpts = JSON.parse(territory.maps__Options__c);
            } catch(e) {
                console.warn('unable to parse territory options: ', territory)
            }
            return terrOpts.colorOptions;
        },
        buildShapeCountInfo: function (shapeCount, $shapeLayer) {
            var infoHtml = '<div><div>Shapes:</div>';
            for(var key in shapeCount) {
                var count = shapeCount[key];
                if(count != 0) {
                    infoHtml += '<div>'+count+' '+key+'(s)</div>';
                }
            }
            infoHtml += '</div>';
            $shapeLayer.find('.adminlevels').append($("<div style='color:#A0A0A0;'></div>").html(infoHtml));
            $shapeLayer.find('.basicinfo-totalGeometry, .basicinfo-type').text(1 + ' ' + MASystem.Labels.MA_Boundary);
            //hide dissolve, not supported
            $shapeLayer.find('#toggle-dissolve').closest('li').remove();
        },
        drawSingleShape: function (geometries, territory, $shapeLayer, options) {
            var dfd = $.Deferred();
            var shapeToArray = getProperty(geometries, 'records', false) || [];
            var geometry = shapeToArray[0];
            var shapeCount = {
                Circle : 0,
                Polygon : 0,
                Rectangle : 0,
                KML : 0,
                Travel : 0
            };
            if (geometry) {
                // parse our json options
                var jsonGeo;
                try {
                    jsonGeo = JSON.parse(geometry.maps__Geometry__c);
                } catch (e) {}
                if (jsonGeo) {
                    jsonGeo['colorOptions'] = MA_DrawShapes.customShapeHelpers.getColorOptions(territory);
                    // plot shape
                    var shapeType = jsonGeo.proximityType ?? ''; 
                    shapeType = shapeType.toLowerCase();
                    var enableEdit = options.enableEdit || false;
                    var shape;
                    switch (shapeType) {
                        case 'kml':
                            shapeCount.KML++;
                            MA_DrawShapes.customShapeHelpers.drawKML(jsonGeo, $shapeLayer);
                            dfd.resolve();
                            break;
                        case 'polygon':
                            shapeCount.Polygon++;
                            shape = MA_DrawShapes.customShapeHelpers.drawPolygon(jsonGeo, $shapeLayer, territory);
                            break;
                        case 'circle':
                            shapeCount.Circle++;
                            shape = MA_DrawShapes.customShapeHelpers.drawCircle(jsonGeo, $shapeLayer, territory);
                            break;
                        case 'rectangle':
                            shapeCount.Rectangle++;
                            shape = MA_DrawShapes.customShapeHelpers.drawRectangle(jsonGeo, $shapeLayer, territory);
                            break;
                        case 'parcel':
                            $shapeLayer.remove();
                            var savedShapeOptions = {
                                id : options.id,
                                label : options.label,
                                name : options.name,
                                description : options.description
                            };
                            $.extend(jsonGeo,savedShapeOptions);
                            MA_DrawShapes.init(jsonGeo);
                            // dfd.resolve();
                            break;
                        case 'traveltime':
                            //consolidate our options for here processing
                            var startLocation      = 'geo!' + jsonGeo.travelLatitude + ',' + jsonGeo.travelLongitude;
                            var legacyTravelMethod = jsonGeo.travelMode == 'drive' ? 'car' : jsonGeo.travelMode;
                            //option mode subject to change user preference have to be dynamic -travelPreference -legacyTravelMethod
                            var optionMode         = (jsonGeo.travelPreference || 'fastest') + ';' + (legacyTravelMethod || 'car') + ';' + 'traffic:'+ (jsonGeo.trafficEnabled || 'disabled');
                            var departureTime;
                            // SFCM-436, removing timezone (+10 AUS fails on HERE side)
                            if (jsonGeo.departure) {
                                departureTime = moment(jsonGeo.departure).format('YYYY-MM-DDTHH:mm:ss');
                            } else {
                                departureTime = moment().local().format('YYYY-MM-DDTHH:mm:ss');;
                            }
                            var rangeType          = jsonGeo.rangetype != undefined ? jsonGeo.rangetype : 'time';
                            var range              = jsonGeo.travelTime || '0';
                            range                  = Math.round(parseFloat(range) * 60); //convert minutes to seconds, HERE api only accept seconds
                            //options stay the same unless version changes
                            var options = {
                                subType: 'core',
                                action : 'isoline',
                                version: '2',
                                method : 'get'
                            };
                            //params support legacy custom shapes, and new custom shapes with traffic
                            /*Example for values
                             *@mode : "fastest;car;traffic:enabled", preferences and traffic enabled/disable.
                             *@start: "geo!33.86,-84.68", lat and lng of address input.
                             *@range: "1000", travel time in seconds.
                             *@rangetype: "time", either time or distance.
                             *@departure: "2017-06-01T10:04:10-04:00", iso date format.
                             */
                            var params = {
                                mode      : optionMode,
                                start     : startLocation,
                                range     : range,
                                rangetype : rangeType,
                                departure : departureTime
                            };

                            // get service area
                            var $loadingShape = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis,timeOut:0,extendedTimeOut:0});

                            Plotting.getServiceArea(options, params).then(function(res) {

                                var bounds = new google.maps.LatLngBounds();
                                var proxObjects = $shapeLayer.data('proxObjects');

                                // draw a small circle to indicate the center
                                var centerPoint = new google.maps.Marker({
                                    position: new google.maps.LatLng({lat:jsonGeo.travelLatitude, lng:jsonGeo.travelLongitude}),
                                    title: 'Travel Time Center',
                                    icon: {
                                        path: google.maps.SymbolPath.CIRCLE,
                                        fillColor: '#ffffff', //'#E7E7E7',
                                        fillOpacity : 1,
                                        strokeColor : '#000000',
                                        strokeWeight : 1,
                                        scale: 4
                                    },
                                });

                                // include center points in bounds
                                bounds.extend(centerPoint.getPosition());

                                // create polygon objects from shapes data
                                res.shapes.forEach(function(shape) {
                                    shapeCount.Polygon++;

                                    var endpoints = shape.coordinates;

                                    var polygon = new google.maps.Polygon({
                                        path: endpoints,
                                        geodesic: true,
                                        isTravelGeom : true,

                                        shapeType : 'travelTime',
                                        fillColor: jsonGeo.colorOptions.fillColor,
                                        fillOpacity: jsonGeo.colorOptions.fillOpacity,
                                        strokeColor: jsonGeo.colorOptions.borderColor,
                                        isSavedTravel : true
                                    });

                                    // polygon click handlers
                                    google.maps.event.addListener(polygon, 'click', function (e) {
                                        proximityLayer_Click({ position: e.latLng, type: 'Polygon', shape: polygon });
                                    });

                                    google.maps.event.addListener(polygon, 'rightclick', function (e) {
                                        Shape_Context.call(this, e);
                                    });

                                    // cache reference to center point in each polygon for removal later
                                    polygon.centerPoint = centerPoint;

                                    proxObjects.push(polygon);

                                    // add this shapes bounds to shapes bounds union
                                    bounds.union(shape.bounds);

                                    // show polygon on map
                                    polygon.setMap(MA.map);

                                    //create shape labels
                                    var labelMarker = MACustomShapes.createLabel(jsonGeo,jsonGeo.colorOptions,polygon,territory.Name);
                                    if (jsonGeo.colorOptions.labelEnabled) {
                                        labelMarker.setVisible(true);
                                        $shapeLayer.find('#toggle-labels').attr('checked','checked');
                                    }
                                    $shapeLayer.data('labelmarkers',[labelMarker]);
                                });

                                centerPoint.setMap(MA.map);
                                MA.map.fitBounds(bounds);

                                //$proxLayer.find('.loadmask').remove();
                                MAToastMessages.hideMessage($loadingShape);
                                MA_DrawShapes.customShapeHelpers.buildShapeCountInfo(shapeCount, $shapeLayer);
                                dfd.resolve();

                            }).fail(function(res) {
                                MAToastMessages.hideMessage($loadingShape);
                                var errMsg = MASystem.Labels.Common_Refresh_And_Try_Again;

                                if(errMsg.indexOf('endpoint') > -1) {
                                    errMsg = window.formatLabel(MASystem.Labels.Common_Unauthorized_URL,[MASystem.Organization.MAIO_URL]);
                                }

                                console.error('Unable to get the service area.');
                                dfd.reject(errMsg);
                            });
                            break;
                        case 'traveldistance':
                            //consolidate our options for here processing
                            var startLocation      = 'geo!' + jsonGeo.travelLatitude + ',' + jsonGeo.travelLongitude;
                            var legacyTravelMethod = jsonGeo.travelMode == 'drive' ? 'car' : jsonGeo.travelMode;
                            //option mode subject to change user preference have to be dynamic -travelPreference -legacyTravelMethod
                            var optionMode = (jsonGeo.travelPreference || 'fastest') + ';' + (legacyTravelMethod || 'car') + ';' + 'traffic:'+ (jsonGeo.trafficEnabled || 'disabled');
                            var departureTime;
                            // SFCM-436, removing timezone (+10 AUS fails on HERE side)
                            if (jsonGeo.departure) {
                                departureTime = moment(jsonGeo.departure).format('YYYY-MM-DDTHH:mm:ss');
                            } else {
                                departureTime = moment().local().format('YYYY-MM-DDTHH:mm:ss');;
                            }

                            var rangeType          = jsonGeo.rangetype != undefined ? jsonGeo.rangetype : 'distance';
                            var range              = jsonGeo.travelDistance || '0';
                            range                  = Math.round(parseFloat(range));

                            //options stay the same unless version changes
                            var options = {
                                subType: 'core',
                                action : 'isoline',
                                version: '2',
                                method : 'get'
                            };
                            //params support legacy custom shapes, and new custom shapes with traffic
                            /*Example for values
                             *@mode : "fastest;car;traffic:enabled", preferences and traffic enabled/disable.
                             *@start: "geo!33.86,-84.68", lat and lng of address input.
                             *@range: "1000", distance in meters.
                             *@rangetype: "distance", either time or distance.
                             *@departure: "2017-06-01T10:04:10-04:00", iso date format.
                             */
                            var params = {
                                mode      : optionMode,
                                start     : startLocation,
                                range     : range,
                                rangetype : rangeType,
                                departure : departureTime
                            };

                            var $loadingShape = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis,timeOut:0,extendedTimeOut:0});
                            // update status
                            //$loadingShape.find('.toast-title').text('Calculating Travel Distance...');
                             shapeCount.Polygon++;
                            // get service area
                            Plotting.getServiceArea(options, params,function(res) {
                                if(res && res.success)
                                {
                                   var bounds = res.bounds; //google boundaries
                                   var endpoints = res.points; //array of lats & lngs

                                   if(Array.isArray(endpoints)) {

                                        var boundary = new google.maps.Polygon({
                                            path: endpoints,
                                            geodesic: true,
                                            isTravelGeom : true,
                                            shapeType : 'travelDistance',
                                            fillColor: jsonGeo.colorOptions.fillColor,
                                            fillOpacity: jsonGeo.colorOptions.fillOpacity,
                                            strokeColor: jsonGeo.colorOptions.borderColor,
                                            isSavedTravel : true
                                        });

                                       // save to DOM
                                       //$proxLayer.data('proxObject', boundary);

                                        //handle clicking on polygon
                                        google.maps.event.addListener(boundary, 'click', function (e) {
                                            proximityLayer_Click({ position: e.latLng, type: 'Polygon', shape: boundary });
                                        });
                                        google.maps.event.addListener(boundary, 'rightclick', function (e) {
                                            Shape_Context.call(this, e);
                                        });


                                         // this displays a center for the plotted boundary
                                        var centerPoint = new google.maps.Marker({
                                            position: new google.maps.LatLng({lat:jsonGeo.travelLatitude, lng:jsonGeo.travelLongitude}),
                                            title: 'Travel Distance Center',
                                            icon: {
                                                path: google.maps.SymbolPath.CIRCLE,
                                                fillColor: '#ffffff', //'#E7E7E7',
                                                fillOpacity : 1,
                                                strokeColor : '#000000',
                                                strokeWeight : 1,
                                                scale: 4
                                            },
                                        });

                                        bounds.extend(centerPoint.getPosition());
                                        boundary.centerPoint = centerPoint;


                                        boundary.setMap(MA.map); // assign boundary shape to map
                                        centerPoint.setMap(MA.map); // display center point
                                        var proxObjects = $shapeLayer.data('proxObjects');
                                        proxObjects.push(boundary);
                                        MA.map.fitBounds(bounds);

                                        //create shape labels
                                        var labelMarker = MACustomShapes.createLabel(jsonGeo,jsonGeo.colorOptions,boundary,territory.Name);
                                        if (jsonGeo.colorOptions.labelEnabled) {
                                            labelMarker.setVisible(true);
                                            $shapeLayer.find('#toggle-labels').attr('checked','checked');
                                        }
                                        $shapeLayer.data('labelmarkers',[labelMarker]);

                                       //$proxLayer.find('.loadmask').remove();
                                       MAToastMessages.hideMessage($loadingShape);
                                       MA_DrawShapes.customShapeHelpers.buildShapeCountInfo(shapeCount, $shapeLayer);
                                       // callback({success:true});
                                       dfd.resolve();
                                   }
                                   else
                                   {
                                        //$proxLayer.find('.loadmask').remove();
                                        MAToastMessages.hideMessage($loadingShape);
                                        //MAToastMessages.showError({message:'Unable to find boundary points.'});
                                        dfd.reject('Unable to find boundary points.');
                                       //  callback({success:false, message:'Unable to find boundary points.'});
                                   }
                                }
                                else
                                {
                                    //$proxLayer.find('.loadmask').remove();
                                    MAToastMessages.hideMessage($loadingShape);
                                    //MAToastMessages.showError({message:'Unable to retreive boundary.', subMessage:'Please try again.'});
                                    dfd.reject('Unable to find boundary points.');
                                    // callback({success:false, message:'Unable to retreive the service area.'});
                                }
                            });
                            break;
                    }
                    if (shape) {
                        dfd.resolve();
                        MA_DrawShapes.customShapeHelpers.buildShapeCountInfo(shapeCount, $shapeLayer);
                        var proxObjects = $shapeLayer.data('proxObjects');
                        addShapeClickEvents(shape);
                        proxObjects.push(shape);
                        MA_DrawShapes.customShapeHelpers.createLabelMarker(jsonGeo,shape,territory,$shapeLayer);
                        if(enableEdit) {
                            //get the shape, just the first one for now
                            shape.setEditable(true);
                        }
                    }
                } else {
                    console.warn('Unable to parse shape options', geometry);
                }
            }
            return dfd.promise();
        },
        createLabelMarker: function (jsonGeo,shape,territory,$shapeLayer) {
            //create shape labels
            var labelMarker = MACustomShapes.createLabel(jsonGeo,jsonGeo.colorOptions,shape,territory.Name);
            if (jsonGeo.colorOptions.labelEnabled) {
                labelMarker.setVisible(true);
                $shapeLayer.find('#toggle-labels').attr('checked','checked');
            }
            $shapeLayer.data('labelmarkers',[labelMarker]);
        },
        drawKML: function (jsonGeo, $shapeLayer) {
            var requestURL;
            if(!jsonGeo.kmlResourceType) {
                requestURL = MA.resources.XMLDoc+'?resourceType=Document&docId='+jsonGeo.id;
            }
            else
            {
                requestURL = MA.resources.XMLDoc+'?resourceType=' + jsonGeo.kmlResourceType + '&docId='+jsonGeo.id;
            }
            new ZipFile(requestURL, function(zip)
            {
                // Set the file type to KML if we failed to unzip the requested URL.
                var type = zip.status.length > 0 ? 'KML' : 'KMZ';
                // use geoxml3 to parse
                var kmlLayer = new geoXML3.parser({
                    map: MA.map,
                    forceType: type,
                    processStyles: true,
                    singleInfoWindow: true,
                    afterParse: function ()
                    {
                        ChangeVisibilityWhenCircleIsAdded();
                        $shapeLayer.find('.loadmask').remove();

                        //keep track of this layer so we can remove it later
                        $shapeLayer.data('kmlLayer', kmlLayer);
                    },
                    failedParse: function ()
                    {
                        MA.log('Unable to parse: ' + MA.resources.XMLDoc+'?docId='+$shapeLayer.find('.options-kml-document').val());
                        var message = MASystem.Labels.Layers_Error_Parsing_KML;
                        MAToastMessages.showError({'message':message,timeOut:6000});
                        $shapeLayer.find('.loadmask').remove();
                    }
                });

                kmlLayer.parse(requestURL);

                //hide options for shapelayer
                $shapeLayer.find('#toggle-labels').closest('li').remove();
                $shapeLayer.find('#limit-within-shape').closest('li').remove();
            });
        },
        drawCircle: function (jsonGeo, $shapeLayer, territory, shapeType) {
            //get the center and radius
            shapeType = shapeType || 'standard'
            var center = new google.maps.LatLng(parseFloat(jsonGeo.center.lat), parseFloat(jsonGeo.center.lng));
            var qid = $shapeLayer.attr('qid');
            // shapeCount.Circle++;
            //create a prox circle and add it to the map
            var shape;
            if (shapeType === 'geoJSON') {
                var convertCoords = MA_DrawShapes.customShapeHelpers.generateGeoJSONCircle(center, jsonGeo.radius, 50);
                shape = {
                    geometry: new google.maps.Data.Polygon([convertCoords.coordinates])
                }
            } else {
                shape = new google.maps.Circle({
                    map: MA.map,
                    center: center,
                    radius: jsonGeo.radius,
                    layerType: 'prox',
                    strokeColor: jsonGeo.colorOptions.borderColor,
                    strokeWeight: 3,
                    strokeOpacity: 1,
                    fillColor: jsonGeo.colorOptions.fillColor,
                    fillOpacity: jsonGeo.colorOptions.fillOpacity,
                    qid : qid,
                    isCustom : true,
                    label : territory.Name,
                    zIndex : 1000
                });
            }
            return shape;
        },
        drawPolygon: function (jsonGeo, $shapeLayer, territory, shapeType) {
            var shape;
            if(jsonGeo.points) {
                var qid = $shapeLayer.attr('qid');
                if (shapeType === 'geoJSON') {
                    shape = {
                        geometry: new google.maps.Data.Polygon([jsonGeo.points])
                    }
                } else {
                    shape = new google.maps.Polygon({
                        paths: jsonGeo.points,
                        strokeColor: jsonGeo.colorOptions.borderColor,
                        strokeOpacity: 0.8,
                        strokeWeight: 3,
                        fillColor: jsonGeo.colorOptions.fillColor,
                        fillOpacity: jsonGeo.colorOptions.fillOpacity,
                        map : MA.map,
                        qid : qid,
                        isCustom : true,
                        label : territory.Name,
                        zIndex : 1000
                    });
                }
            }
            return shape;
        },
        drawRectangle: function (jsonGeo, $shapeLayer, territory, shapeType) {
            var shape;
            if(jsonGeo.bounds) {
                //create the lat lng bounds
                var point1 = new google.maps.LatLng(jsonGeo.bounds.NE.lat,jsonGeo.bounds.NE.lng);
                var point2 = new google.maps.LatLng(jsonGeo.bounds.SW.lat,jsonGeo.bounds.NE.lng);
                var point3 = new google.maps.LatLng(jsonGeo.bounds.SW.lat,jsonGeo.bounds.SW.lng);
                var point4 = new google.maps.LatLng(jsonGeo.bounds.NE.lat,jsonGeo.bounds.SW.lng);
                var qid = $shapeLayer.attr('qid');
                if (shapeType === 'geoJSON') {
                    shape = {
                        geometry: new google.maps.Data.Polygon([[point1,point2,point3,point4]])
                    }
                } else {
                    var bounds = new google.maps.LatLngBounds(
                        point3,
                        point1
                    );

                    shape = new google.maps.Rectangle({
                        strokeColor: jsonGeo.colorOptions.borderColor,
                        strokeOpacity: 0.8,
                        strokeWeight: 3,
                        fillColor: jsonGeo.colorOptions.fillColor,
                        fillOpacity: jsonGeo.colorOptions.fillOpacity,
                        map : MA.map,
                        bounds : bounds,
                        qid : qid,
                        rid: territory.Id,
                        isCustom : true,
                        label : territory.Name,
                        zIndex : 1000
                    });
                }
            }
            return shape;
        }
    }
};

function normalizeShapeData(options) {

    var country = getProperty(options, 'data.country', false);
    var postBody = {
        "format": "GeoJSON",
        "apitoken": options.APIKey || MA.APIKey|| ''
    };
    if (country == 'shapesV2') {
        //update old structure to pass to new endpoint
        postBody.geoids = getProperty(options, 'data.ids') || [];
		postBody.merged = getProperty(options, 'data.dissolve', false) || false;
    }
    else {
        postBody.geoids = getProperty(options, 'data.ids') || [];
		postBody.merged = getProperty(options, 'data.dissolve', false) || false;
    }

    return postBody;
}

function GetDataFromServer(options) {

	$.extend({
		data: {}
	}, options || {});
	options.tryOld = true;
	var dfd = $.Deferred();

	var $layer = options.layer;
    if($layer) {
        $layer.find('.plottinginfo-wrapper .inline').eq(1).text(MASystem.Labels.MA_Loading_With_Ellipsis);
    }

	//normalize our data from legacy use cases
	var postBody = normalizeShapeData(options);

	//send request for territory info
    const urlPath = '/boundary/geography/2';
	Visualforce.remoting.Manager.invokeAction(MARemoting.postJSONToHyperforceGISService,
		urlPath,
		JSON.stringify(postBody),
        true,
		function(response, event) {
		    handleGetBoundaryData(response, event, options).then(function (res) {
		        dfd.resolve(res);
		    });
		}, {buffer: false,escape: false,timeout: 120000}
	);
	return dfd.promise();
}

function handleGetBoundaryData (response,event,options) {
    //breaking this out because of heap size
    //try SF Remote, then ajax(ajax is often blocked, so using sf first)
    var dfd = $.Deferred();

    var $layer = options.layer;
    if($layer) {
        $layer.find('.plottinginfo-wrapper .inline').eq(1).text('');
    }

    var kmlInfo = options.layer.data('kmlInfo') || [];
    if (event.status) {
		if (response.success)
		{
        	var labelArray = [];
        	var resData = response.data || '{}';
        	//parse the data from server here to reduce heap size
        	var parsedData = {};
        	if(typeof(resData) === 'string') {
        	    try{
            		var stringData = response.data || '{}';
            		parsedData = JSON.parse(stringData);
            	}
            	catch(e) {
            		MAToastMessages.showError({message: MASystem.Labels.Layers_Mobile_Build_Layer_Element_Title,subMessage: MASystem.Labels.Layers_Remove_Number_Of_Shapes,timeOut:8000});
            		dfd.resolve({
            			success: false
            		});
            		MA.log(e);
            	}
        	}
        	else {
        	    //if we processed this on the page side, it will not be a string
        	    //just update our var and pass it on
        	    parsedData = resData;
        	}

        	resData = getProperty(parsedData, 'data', false) || [];
        	$.each(resData, function(k, v) {
        		$.each(v.geojson.features, function(kk, vv) {
        			var theData = vv;

        			//build geoJSON return values and add to map
        			options.layer.data('dataLayer').addGeoJson(theData);
        			kmlInfo.push(theData);
        			options.layer.data('kmlInfo', kmlInfo);
        			if (true) {
        				//var features = getProperty(vv,'geojson.features',false) || [];
        				var labelPosition = getProperty(v, 'label_position');

        				var labelLat = getProperty(labelPosition, options.data.labelposition + '.lat', false);
        				var labelLng = getProperty(labelPosition, options.data.labelposition + '.lng', false);

        				var labelText = getProperty(vv, 'properties.label', false);

        				if (labelText == 'Merged Shape') {
        					//grab the shape label
        					var labelOver = options.data.labelOverride;
        					labelText = labelOver == '' ? options.data.name : labelOver;
        				}

        				var labelObject = {
        					lat: labelLat,
        					lng: labelLng,
        					text: labelText
        				}
        				labelArray.push(labelObject);
        			}
        		});
        	});
        	if (options.layer.data('labels') == undefined) {
        		options.layer.data('labels', []);
        	}
        	var previousLabels = options.layer.data('labels');
        	var joinedLabels = previousLabels.concat(labelArray);
        	options.layer.data('labels', joinedLabels);
        	dfd.resolve({
        		geomLabels: getProperty(parsedData, 'geomLabels', false),
        		success: true
        	});
        } else {
            MAToastMessages.showError({ message: MASystem.Labels.Layers_Mobile_Build_Layer_Element_Title, subMessage: MASystem.Labels.Layers_Remove_Number_Of_Shapes, timeOut: 8000 });
            dfd.resolve({success: false});
        }
    }
    else {
        var errMsg = MASystem.Labels.Common_Refresh_And_Try_Again;
        if (errMsg.indexOf('heap size') > -1) {
            errMsg = MASystem.Labels.Layers_Remove_Number_Of_Shapes
        }
        MAToastMessages.showError({ message: MASystem.Labels.Layers_Mobile_Build_Layer_Element_Title, subMessage: errMsg, timeOut: 8000 });
        dfd.resolve({
            success: false
        });
	}
    return dfd.promise();
}

// merge geoIds and store merged geometry in S3
function startMergeJob(geoIds) {
    var dfd = jQuery.Deferred();

    var processData = {
        subType: 'geometry',
        action: 'merge',
        version: '2'
    };

    // unable to merge single geometry so lets merge 2 of the same geo ids to fake it
    if (geoIds.length == 1) {
        geoIds.push(geoIds[0]);
    }

    var postBody = {
        "geo_ids": geoIds
    }

    Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequestPOST,processData, JSON.stringify(postBody), function(jobResponse, event) {
        if (jobResponse.success) {
            dfd.resolve(jobResponse);
        } else {
            dfd.reject({message: MASystem.Labels.Common_Refresh_And_Try_Again });
        }
    });

    return dfd.promise();
}
