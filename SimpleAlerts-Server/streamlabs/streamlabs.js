const https = require('https');
const authBaseHostName = 'streamlabs.com';
const StreamlabsSocketClient = require('streamlabs-socket-client');

//-- Helpers --//
var tokenBodyBuilder = code => {
  return JSON.stringify({
    grant_type: 'authorization_code',
    client_id: process.env.STREAMLABS_CLIENT_ID,
    client_secret: process.env.STREAMLABS_SECRET,
    redirect_uri: process.env.STREAMLABS_REDIRECT_URI,
    code: code
  });
};

module.exports = {
  getAuthToken: code => {
    let token;

    return new Promise((resolve, reject) => {
      console.log('[Streamlabs.getAuthToken] Starting auth token request...');

      // Create body params //
      var bodyData = tokenBodyBuilder(code);

      var request = https.request(
        {
          method: 'POST',
          hostname: authBaseHostName,
          path: '/api/v1.0/token',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'Content-Length': bodyData.length
          }
        },
        response => {
          response.on('data', tokenJson => {
            console.log('[Streamlabs.getAuthToken] Response received.');
            token = JSON.parse(tokenJson.toString());
          });

          response.on('end', () => {
            console.log('[Streamlabs.getAuthToken] Promise resolved.');
            resolve(token.access_token);
          });
        }
      );

      request.on('error', error => {
        console.log(error);
        reject(error);
      });

      request.write(bodyData);
      request.end();
    });
  },

  getSocketToken: accessToken => {
    return new Promise((resolve, reject) => {
      request = https
        .request(
          {
            method: 'GET',
            hostname: authBaseHostName,
            path: `/api/v1.0/socket/token?access_token=${accessToken}`,
            headers: {
              accept: 'application/json'
            }
          },
          response => {
            response.on('data', tokenJson => {
              console.log('[Streamlabs.getSocketToken] Response received.');
              token = JSON.parse(tokenJson.toString());
            });

            response.on('end', () => {
              console.log('[Streamlabs.getSocketToken] Promise resolved.');
              resolve(token.socket_token);
            });
          }
        )
        .on('error', error => {
          console.log('[Streamlabs.getSocketToken] Error received: ' + error);
        })
        .end();
    });
  },

  setupSocket: socketToken => {
    var client = new StreamlabsSocketClient({
      token: socketToken,
      emitTests: true,
      rawEvent: ['connect']
    });

    client.on('follow', follow => {
      console.log(follow);
    });

    client.on('donation', donation => {
      console.log(donation);
    });

    client.on('subscription', subscription => {
      console.log(subscription);
    });

    client.on('resubscription', resubscription => {
      console.log(resubscription);
    });

    // Bit event //
    client.on('bits', bits => {
      console.log(bits);
    });

    client.connect();
  },

  getUserInfo: token => {
    return new Promise((resolve, reject) => {
      var userData;

      var request = https.get(
        `https://streamlabs.com/api/v1.0/user?access_token=${token}`,
        response => {
          if (response.statusCode === 400) {
            console.log('[getUserInfo] Error requesting user from Streamlabs.');
            reject(`${response.error}: ${response.message}`);
            return;
          }

          response.on('data', data => {
            userData = data;
          });

          response.on('end', () => {
            console.log('[getUserInfo] Resolved User Data.');
            resolve(JSON.parse(userData.toString()));
          });
        }
      );
      request.on('error', error => {
        console.log('[getUserInfo] ERROR: ' + error);
        reject(error);
        return;
      });

      request.end();
    });
  }
};
