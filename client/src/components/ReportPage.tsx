import React, { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import './ReportPage.css';
import './Home.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface Configuration {
    id: string;
    toiletType: string;
    floor: string;
}

const ReportPage = () => {
    const [dateType, setDateType] = useState('day');
    const [dateValue, setDateValue] = useState<Date | null>(new Date());
    const [washrooms, setWashrooms] = useState<{ label: string; value: string }[]>([]);
    const [selectedWashroom, setSelectedWashroom] = useState<{ label: string; value: string } | null>(null);
    const [reportType, setReportType] = useState('usage');
    const [chartData, setChartData] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('http://localhost:5000/configurations')
            .then(response => response.json())
            .then((data: Configuration[]) => {
                const sortedWashrooms = sortWashrooms(data.map(config => `${config.floor} ${config.toiletType}`));
                setWashrooms(sortedWashrooms.map(washroom => ({ label: washroom, value: washroom })));
            });
    }, []);

    useEffect(() => {
        if (dateValue && selectedWashroom && reportType) {
            fetchReportData();
        }
    }, [dateValue, selectedWashroom, reportType]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const sortWashrooms = (washrooms: string[]) => {
        return washrooms.sort((a, b) => {
            const [floorA, typeA] = a.split(' ');
            const [floorB, typeB] = b.split(' ');

            const floorOrder = ['G', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
            const typeOrder = ['oku', 'male', 'female'];

            const floorIndexA = floorOrder.indexOf(floorA);
            const floorIndexB = floorOrder.indexOf(floorB);

            if (floorIndexA !== floorIndexB) {
                return floorIndexA - floorIndexB;
            } else {
                return typeOrder.indexOf(typeA) - typeOrder.indexOf(typeB);
            }
        });
    };

    const formatDateValue = (date: Date, type: string): string => {
        const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        if (type === 'day') {
            return utcDate.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (type === 'month') {
            const year = utcDate.getUTCFullYear();
            const month = (utcDate.getUTCMonth() + 1).toString().padStart(2, '0'); // Add leading zero
            return `${year}-${month}`; // YYYY-MM
        }
        return '';
    };

    const fetchReportData = async () => {
        const dateValueStr = formatDateValue(dateValue as Date, dateType);

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/report?dateType=${dateType}&dateValue=${dateValueStr}&washroom=${selectedWashroom?.value}&reportType=${reportType}`);
            const data = await response.json();
            setChartData(data.message ? null : data); // Check for no data message
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getUsageChartData = () => {
        if (dateType === 'day') {
            return {
                labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                datasets: [
                    {
                        label: 'People Count',
                        data: chartData,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                    },
                ],
            };
        } else {
            const daysInMonth = new Date(dateValue!.getUTCFullYear(), dateValue!.getUTCMonth() + 1, 0).getUTCDate();
            return {
                labels: Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()),
                datasets: [
                    {
                        label: 'People Count',
                        data: chartData,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                    },
                ],
            };
        }
    };

    const getFeedbackChartData = () => {
        return {
            labels: chartData?.labels || [],
            datasets: [
                {
                    label: 'Problem Count',
                    data: chartData?.counts || [],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                },
            ],
        };
    };

    const renderProblemMessage = (): JSX.Element | null => {
        if (!chartData?.labels || !chartData?.counts) return null;
    
        const problemCounts = chartData.counts as number[];
        const maxCount = Math.max(...problemCounts);
        const mostFrequentProblems = chartData.labels.filter((_: string, index: number) => problemCounts[index] === maxCount);
    
        const solutions: { [key: string]: string } = {
            'RUBBISH BIN FULL': 'Solution: Consider using larger bins. Implement a schedule for regular checks and ensure staff are trained to manage waste effectively.',
            'HAND DRYER BROKEN': 'Solution: Consider having a backup hand dryer or paper towels available. Regularly check the hand dryer for issues and perform routine maintenance.',
            'NO SOAP': 'Solution: Implement a routine check to ensure soap dispensers are refilled regularly. Use larger soap dispensers to reduce the frequency of refills and keep spare soap in stock.',
            'SMELLY': 'Solution: Use air fresheners or automatic air sanitizers. Ensure proper ventilation and address any underlying plumbing issues that could cause odors.',
            'NO TOILET PAPER': 'Solution: Increase the frequency of checks to restock toilet paper. Use larger or multiple toilet paper holders. Keep spare rolls accessible to cleaning staff.',
            'WET FLOOR': 'Solution: Identify the source of the water and fix any leaks or plumbing issues. Use non-slip mats and ensure that floors are mopped regularly. Display warning signs to alert users of wet floors.',
            'DIRTY MIRROR': 'Solution: Clean mirrors regularly as part of the routine cleaning schedule. Use appropriate glass cleaners and ensure cleaning staff are aware of the importance of clean mirrors.',
            'DIRTY SINK': 'Solution: Ensure sinks are cleaned regularly as part of the cleaning schedule. Use appropriate cleaning agents and check for clogs or plumbing issues.',
            'DIRTY TOILET BOWL': 'Solution: Implement a more frequent cleaning schedule for toilets. Ensure staff are trained to clean effectively and use appropriate cleaning products.'
        };
    
        return (
            <div className="problem-message">
                <h2>Most Frequent Problem{mostFrequentProblems.length > 1 ? 's' : ''}</h2>
                {mostFrequentProblems.map((problem: string) => (
                    <div key={problem}>
                        <p>Problem: {problem}</p>
                        <p>{solutions[problem]}</p>
                    </div>
                ))}
            </div>
        );
    };
    
    const getRatingChartData = () => {
        const ratings = Array.isArray(chartData) ? chartData : [];
        const totalRatings = ratings.reduce((acc: number, count: number) => acc + count, 0);
        const overallRating = totalRatings > 0 ? (ratings.reduce((acc: number, count: number, index: number) => acc + count * index, 0) / totalRatings) : 0;
    
        return {
            labels: ['0', '1', '2', '3', '4', '5'],
            datasets: [
                {
                    label: 'Rating Count',
                    data: ratings,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1,
                },
            ],
            overallRating: overallRating.toFixed(2),
        };
    };
    
    const renderRecommendations = (overallRating: number) => {
        if (overallRating > 4) {
            return <p className="problem-message">Great job! Your washroom is receiving excellent ratings. Keep up the good work and maintain the high standards.</p>;
        } else if (overallRating >= 2 && overallRating <= 4) {
            return <p className="problem-message">The washroom is receiving moderate ratings. Consider reviewing the feedback and addressing the most common issues to improve user satisfaction.</p>;
        } else {
            return <p className="problem-message">The washroom is receiving poor ratings. Immediate action is needed to address the significant issues raised by users. Prioritize cleanliness, supplies, and maintenance.</p>;
        }
    };
    
    const renderChart = () => {
        if (loading) return <p>Loading...</p>;
        if (!chartData) return <p className="no-data-message">No data available</p>;
    
        switch (reportType) {
            case 'usage':
                return <div className="chart-wrapper"><div className="chart"><Bar data={getUsageChartData()} /></div></div>;
            case 'feedback':
                return (
                    <div className="chart-wrapper">
                        <div className="chart"><Bar data={getFeedbackChartData()} /></div>
                        {renderProblemMessage()}
                    </div>
                );
            case 'rating':
                const ratingChartData = getRatingChartData();
                return (
                    <div className="chart-wrapper">
                        <div className="chart"><Bar data={ratingChartData} options={{ indexAxis: 'y' }} /></div>
                        <div className="problem-message">Overall Rating: {ratingChartData.overallRating}</div>
                        {renderRecommendations(Number(ratingChartData.overallRating))}
                    </div>
                );
            default:
                return null;
        }
    };    
    
    const handleLogout = () => {
        navigate('/');
    };

    const handleHomeClick = () => {
        navigate('/home');
    };

    const customSelectStyles = {
        container: (provided: any) => ({
            ...provided,
            width: 200, // Set the fixed width you desire
        }),
        control: (provided: any) => ({
            ...provided,
            height: '40px', // Match the height of other controls
        }),
        valueContainer: (provided: any) => ({
            ...provided,
            height: '40px', // Ensure the inner container also matches
            padding: '0 10px',
        }),
        input: (provided: any) => ({
            ...provided,
            margin: 0,
            padding: 0,
        }),
        indicatorsContainer: (provided: any) => ({
            ...provided,
            height: '40px', // Ensure the indicators container matches
        }),
    };

    return (
        <div className="report-container">
            <header>
                <button className="home-button" onClick={handleHomeClick}>
                    <i className="fas fa-home"></i> HOME
                </button>
                <div>
                    <h1>SMART WASHROOM FEEDBACK SYSTEM - REPORT</h1>
                    <div className="date-time">{currentTime}</div>
                </div>
                <button onClick={() => navigate('/')} className="btn btn-link logout-button">
                    <i className="fas fa-sign-out-alt"></i> LOG OUT
                </button>
            </header>
            <div className="controls">
                <div className="filter-item">
                    <label>Report Type:</label>
                    <Select
                        value={{ label: dateType.charAt(0).toUpperCase() + dateType.slice(1), value: dateType }}
                        onChange={(selectedOption) => setDateType(selectedOption?.value || 'day')}
                        options={[
                            { value: 'day', label: 'Day' },
                            { value: 'month', label: 'Month' },
                        ]}
                        styles={customSelectStyles}
                    />
                </div>
                <div className="filter-item date-picker-wrapper">
                    <label>Date:</label>
                    <DatePicker
                        selected={dateValue}
                        onChange={date => setDateValue(date)}
                        dateFormat={dateType === 'day' ? 'yyyy-MM-dd' : 'yyyy-MM'}
                        showMonthYearPicker={dateType === 'month'}
                        className="fixed-width-datepicker"
                    />
                </div>
                <div className="filter-item">
                    <label>Washroom:</label>
                    <Select
                        value={selectedWashroom}
                        onChange={(selectedOption) => setSelectedWashroom(selectedOption)}
                        options={washrooms}
                        isClearable
                        styles={customSelectStyles}
                    />
                </div>
                <div className="filter-item">
                    <label>Report Parameter:</label>
                    <Select
                        value={{ label: reportType.charAt(0).toUpperCase() + reportType.slice(1), value: reportType }}
                        onChange={(selectedOption) => setReportType(selectedOption?.value || 'usage')}
                        options={[
                            { value: 'usage', label: 'Usage' },
                            { value: 'feedback', label: 'Feedback' },
                            { value: 'rating', label: 'Rating' },
                        ]}
                        styles={customSelectStyles}
                    />
                </div>
            </div>
            <div className="chart-container">
                {renderChart()}
            </div>
        </div>
    );
};

export default ReportPage;