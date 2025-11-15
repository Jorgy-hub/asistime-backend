const port = 1420;

const Config = {
    apiUrl: 'http://172.16.0.110:' + port,
    apiPort: port,
    dbUri: 'mongodb://localhost:27017/scanner-prepa3',
    apiKey: 'dev-prepa3-key',
    jwtSecret: 'dev-prepa3-secret',
    jwtExpiresIn: '7d',
};

export default Config;